"use server"

import { generateText } from "ai"
import { aiModel, extractJSON } from "@/lib/ai"
import { createClient } from "@/lib/supabase/server"
import { getCalendarData, saveBlock, startTimer, stopTimer } from "./timer"
import type {
  ActiveTimer,
  EffortLevel,
  Mood,
  Satisfaction,
  SaveBlockInput,
  TimeBlock,
  TimeBlockCategory,
} from "@/lib/types"

const CATEGORIES = [
  "deep_work",
  "admin",
  "social",
  "errands",
  "care",
  "creative",
  "rest",
] satisfies TimeBlockCategory[]
const MOODS = ["joyful", "neutral", "flat", "anxious", "guilty", "proud"] satisfies Mood[]
const EFFORT_LEVELS = ["easy", "medium", "hard", "grind"] satisfies EffortLevel[]
const SATISFACTION_LEVELS = [
  "satisfied",
  "mixed",
  "frustrated",
  "unclear",
] satisfies Satisfaction[]

export interface CoachDraft {
  task_name: string | null
  category: TimeBlockCategory | null
  hashtags: string[]
  notes: string | null
  started_at: string | null
  ended_at: string | null
  duration_minutes: number | null
  mood: Mood | null
  effort_level: EffortLevel | null
  satisfaction: Satisfaction | null
  avoidance_marker: boolean
  hyperfocus_marker: boolean
  guilt_marker: boolean
  novelty_marker: boolean
}

export interface ProcessCoachMessageInput {
  text: string
  draft?: CoachDraft | null
  timezone?: string | null
}

export type ProcessCoachMessageResult =
  | {
      type: "logged"
      ack: string
      timeBlock: TimeBlock
    }
  | {
      type: "timer_started"
      ack: string
      activeTimer: ActiveTimer
    }
  | {
      type: "timer_already_running"
      ack: string
      activeTimer: ActiveTimer
    }
  | {
      type: "timer_stopped"
      ack: string
      timeBlock: TimeBlock
    }
  | {
      type: "timer_not_running"
      message: string
    }
  | {
      type: "analysis"
      message: string
    }
  | {
      type: "clarify"
      question: string
      draft: CoachDraft
    }
  | {
      type: "error"
      message: string
    }

type RouterIntent = "log_block" | "start_timer" | "stop_timer" | "analyse_blocks" | "clarify"

interface RouterOutput extends CoachDraft {
  intent: RouterIntent
}

function isCategory(value: unknown): value is TimeBlockCategory {
  return typeof value === "string" && (CATEGORIES as readonly string[]).includes(value)
}

function isMood(value: unknown): value is Mood {
  return typeof value === "string" && (MOODS as readonly string[]).includes(value)
}

function isEffort(value: unknown): value is EffortLevel {
  return typeof value === "string" && (EFFORT_LEVELS as readonly string[]).includes(value)
}

function isSatisfaction(value: unknown): value is Satisfaction {
  return typeof value === "string" && (SATISFACTION_LEVELS as readonly string[]).includes(value)
}

function cleanString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }

  const trimmed = value.trim()
  return trimmed || null
}

function cleanTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().toLowerCase().replace(/^#+/, ""))
    .filter(Boolean)
}

function cleanIso(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function cleanDuration(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null
  }

  return Math.round(value)
}

function mergeDraft(base: CoachDraft | null | undefined, next: CoachDraft): CoachDraft {
  return {
    task_name: next.task_name ?? base?.task_name ?? null,
    category: next.category ?? base?.category ?? null,
    hashtags: next.hashtags.length > 0 ? next.hashtags : base?.hashtags ?? [],
    notes: next.notes ?? base?.notes ?? null,
    started_at: next.started_at ?? base?.started_at ?? null,
    ended_at: next.ended_at ?? base?.ended_at ?? null,
    duration_minutes: next.duration_minutes ?? base?.duration_minutes ?? null,
    mood: next.mood ?? base?.mood ?? null,
    effort_level: next.effort_level ?? base?.effort_level ?? null,
    satisfaction: next.satisfaction ?? base?.satisfaction ?? null,
    avoidance_marker: next.avoidance_marker || base?.avoidance_marker === true,
    hyperfocus_marker: next.hyperfocus_marker || base?.hyperfocus_marker === true,
    guilt_marker: next.guilt_marker || base?.guilt_marker === true,
    novelty_marker: next.novelty_marker || base?.novelty_marker === true,
  }
}

function normalizeRouterOutput(parsed: Record<string, unknown> | null, fallbackText: string): RouterOutput {
  const intent = parsed?.intent
  const normalizedIntent: RouterIntent =
    intent === "start_timer" ||
    intent === "stop_timer" ||
    intent === "analyse_blocks" ||
    intent === "clarify" ||
    intent === "log_block"
      ? intent
      : "log_block"

  return {
    intent: normalizedIntent,
    task_name: cleanString(parsed?.task_name) ?? (parsed ? null : fallbackText),
    category: isCategory(parsed?.category) ? parsed.category : null,
    hashtags: cleanTags(parsed?.hashtags),
    notes: cleanString(parsed?.notes),
    started_at: cleanIso(parsed?.started_at),
    ended_at: cleanIso(parsed?.ended_at),
    duration_minutes: cleanDuration(parsed?.duration_minutes),
    mood: isMood(parsed?.mood) ? parsed.mood : null,
    effort_level: isEffort(parsed?.effort_level) ? parsed.effort_level : null,
    satisfaction: isSatisfaction(parsed?.satisfaction) ? parsed.satisfaction : null,
    avoidance_marker: parsed?.avoidance_marker === true,
    hyperfocus_marker: parsed?.hyperfocus_marker === true,
    guilt_marker: parsed?.guilt_marker === true,
    novelty_marker: parsed?.novelty_marker === true,
  }
}

function deriveWindow(draft: CoachDraft): { startedAt: string; endedAt: string } | null {
  if (draft.started_at && draft.ended_at) {
    const startedAt = new Date(draft.started_at)
    const endedAt = new Date(draft.ended_at)

    if (!Number.isNaN(startedAt.getTime()) && endedAt.getTime() > startedAt.getTime()) {
      return {
        startedAt: startedAt.toISOString(),
        endedAt: endedAt.toISOString(),
      }
    }
  }

  if (draft.ended_at && draft.duration_minutes) {
    const endedAt = new Date(draft.ended_at)
    if (!Number.isNaN(endedAt.getTime())) {
      return {
        startedAt: new Date(endedAt.getTime() - draft.duration_minutes * 60_000).toISOString(),
        endedAt: endedAt.toISOString(),
      }
    }
  }

  if (draft.started_at && draft.duration_minutes) {
    const startedAt = new Date(draft.started_at)
    if (!Number.isNaN(startedAt.getTime())) {
      return {
        startedAt: startedAt.toISOString(),
        endedAt: new Date(startedAt.getTime() + draft.duration_minutes * 60_000).toISOString(),
      }
    }
  }

  return null
}

function defaultCategoryFor(text: string): TimeBlockCategory {
  const lower = text.toLowerCase()

  if (/\b(code|coding|bug|debug|write|writing|design|deep|client|build)\b/.test(lower)) {
    return "deep_work"
  }

  if (/\b(email|admin|invoice|paperwork|forms|planning)\b/.test(lower)) {
    return "admin"
  }

  if (/\b(meeting|call|coffee|lunch|friend|team)\b/.test(lower)) {
    return "social"
  }

  if (/\b(shop|shopping|grocery|groceries|errand|bank|post office)\b/.test(lower)) {
    return "errands"
  }

  if (/\b(clean|cook|doctor|therapy|exercise|walk|shower|laundry)\b/.test(lower)) {
    return "care"
  }

  if (/\b(draw|music|paint|song|photo|creative)\b/.test(lower)) {
    return "creative"
  }

  if (/\b(rest|nap|sleep|break|recover)\b/.test(lower)) {
    return "rest"
  }

  return "admin"
}

function draftToSaveInput(draft: CoachDraft, window: { startedAt: string; endedAt: string }): SaveBlockInput {
  const taskName = draft.task_name?.trim() || "logged work"
  const category = draft.category ?? defaultCategoryFor(`${taskName} ${draft.notes ?? ""}`)

  return {
    task_name: taskName,
    category,
    started_at: window.startedAt,
    ended_at: window.endedAt,
    hashtags: draft.hashtags,
    notes: draft.notes,
    mood: draft.mood,
    effort_level: draft.effort_level,
    satisfaction: draft.satisfaction,
    avoidance_marker: draft.avoidance_marker,
    hyperfocus_marker: draft.hyperfocus_marker,
    guilt_marker: draft.guilt_marker,
    novelty_marker: draft.novelty_marker,
  }
}

function getDayRange() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)
  end.setDate(end.getDate() + 1)

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  }
}

function getAnalysisRange(draft: CoachDraft | null | undefined) {
  if (draft?.started_at && draft.ended_at) {
    const startedAt = new Date(draft.started_at)
    const endedAt = new Date(draft.ended_at)

    if (!Number.isNaN(startedAt.getTime()) && endedAt.getTime() > startedAt.getTime()) {
      return {
        start: startedAt.toISOString(),
        end: endedAt.toISOString(),
      }
    }
  }

  return getDayRange()
}

function formatBlockForPrompt(block: TimeBlock) {
  const duration = block.duration_seconds
    ? `${Math.round(block.duration_seconds / 60)} min`
    : "duration unknown"
  const startedAt = new Date(block.started_at).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  })
  const task = block.task_name ?? "unnamed block"
  const category = block.category ? block.category.replace("_", " ") : "uncategorized"
  const tags = block.hashtags?.length ? ` #${block.hashtags.join(" #")}` : ""

  return `- ${startedAt}: ${task} (${category}, ${duration})${tags}`
}

async function routeMessage(
  text: string,
  draft: CoachDraft | null | undefined,
  timezone: string | null | undefined,
): Promise<RouterOutput> {
  try {
    const { text: routerText } = await generateText({
      model: aiModel,
      prompt: [
        "Classify this Alibi chat message and extract structured time-block data.",
        "Reply ONLY with one JSON object.",
        "",
        "Valid intents: log_block, start_timer, stop_timer, analyse_blocks, clarify.",
        "Use log_block when the user is recording completed work.",
        "Use start_timer or stop_timer for explicit timer control.",
        "Use analyse_blocks when they ask what they did, how long they spent, patterns, or reassurance from saved records.",
        "Use clarify only when the new message answers a prior clarification but is still incomplete.",
        "",
        "Schema:",
        "{",
        '  "intent": "log_block" | "start_timer" | "stop_timer" | "analyse_blocks" | "clarify",',
        '  "task_name": "string | null",',
        '  "category": "deep_work | admin | social | errands | care | creative | rest | null",',
        '  "hashtags": ["strings without #"],',
        '  "notes": "string | null",',
        '  "started_at": "ISO datetime | null",',
        '  "ended_at": "ISO datetime | null",',
        '  "duration_minutes": "number | null",',
        '  "mood": "joyful | neutral | flat | anxious | guilty | proud | null",',
        '  "effort_level": "easy | medium | hard | grind | null",',
        '  "satisfaction": "satisfied | mixed | frustrated | unclear | null",',
        '  "avoidance_marker": "boolean",',
        '  "hyperfocus_marker": "boolean",',
        '  "guilt_marker": "boolean",',
        '  "novelty_marker": "boolean"',
        "}",
        "",
        "Rules:",
        "- Resolve relative dates and times against the current date and timezone.",
        "- If the user says a range like '2 to 3:30', return both started_at and ended_at.",
        "- If they give a duration only, return duration_minutes.",
        "- Do not invent a time window.",
        "- Prefer concise task names without filler words like 'worked on'.",
        "",
        `Current timestamp: ${new Date().toISOString()}`,
        `User timezone: ${timezone || "unknown"}`,
        `Prior draft, if any: ${JSON.stringify(draft ?? null)}`,
        `User message: ${text}`,
      ].join("\n"),
    })

    return normalizeRouterOutput(extractJSON(routerText), text)
  } catch {
    return normalizeRouterOutput(null, text)
  }
}

async function makeAck(kind: "logged" | "started" | "stopped", subject: string) {
  const fallback =
    kind === "started" ? "timer running." : kind === "stopped" ? "timer stopped." : "logged."

  try {
    const { text } = await generateText({
      model: aiModel,
      prompt: [
        "You are Alibi. Write one short lowercase acknowledgment.",
        "Rules: 2 to 5 words, end with a period, no emojis, no exclamation marks, no praise.",
        `Action: ${kind}`,
        `Subject: ${subject}`,
      ].join("\n"),
    })
    const cleaned = text.trim().replace(/^["']|["']$/g, "").toLowerCase()
    return cleaned && cleaned.length <= 48 ? cleaned : fallback
  } catch {
    return fallback
  }
}

async function analyseBlocks(message: string, draft: CoachDraft | null | undefined) {
  const range = getAnalysisRange(draft)
  const result = await getCalendarData(range)

  if (result.type === "error") {
    return result.message
  }

  const blocks = result.timeBlocks
  const context = blocks.length
    ? blocks.map(formatBlockForPrompt).join("\n")
    : "(no time blocks saved today)"

  try {
    const { text } = await generateText({
      model: aiModel,
      system: [
        "You are Alibi: the friend who remembers the user's day so they don't have to defend it to themselves.",
        "Answer using ONLY the provided time_blocks context.",
        "Be warm, specific, lowercase, and under 90 words.",
        "Do not mention entries. Do not invent unsaved work. Do not give productivity advice.",
      ].join("\n"),
      prompt: [
        `User asked: ${message}`,
        "",
        "Saved time_blocks in range:",
        context,
      ].join("\n"),
    })

    return text.trim() || "nothing on the record yet today."
  } catch {
    if (blocks.length === 0) {
      return "nothing on the record yet today."
    }

    return `today has ${blocks.length} saved block${blocks.length === 1 ? "" : "s"}: ${blocks
      .map((block) => block.task_name ?? "unnamed block")
      .join(", ")}.`
  }
}

function clarificationQuestion(draft: CoachDraft) {
  if (!deriveWindow(draft)) {
    return "what time was that, or about how long did it take?"
  }

  if (!draft.task_name?.trim()) {
    return "what should i call that block?"
  }

  if (!draft.category) {
    return "what category should i file it under?"
  }

  return "what else should i add before i log it?"
}

export async function processCoachMessage(
  input: ProcessCoachMessageInput | string,
): Promise<ProcessCoachMessageResult> {
  const text = typeof input === "string" ? input : input.text
  const draft = typeof input === "string" ? null : input.draft ?? null
  const timezone = typeof input === "string" ? null : input.timezone ?? null
  const trimmed = text.trim()

  if (!trimmed) {
    return { type: "error", message: "say something." }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { type: "error", message: "not signed in." }
  }

  const routed = await routeMessage(trimmed, draft, timezone)
  const mergedDraft = mergeDraft(draft, routed)

  if (routed.intent === "start_timer") {
    const result = await startTimer()
    if (result.type === "started") {
      return {
        type: "timer_started",
        ack: await makeAck("started", mergedDraft.task_name ?? "timer"),
        activeTimer: result.activeTimer,
      }
    }

    if (result.type === "already_running") {
      return {
        type: "timer_already_running",
        ack: "timer already running.",
        activeTimer: result.activeTimer,
      }
    }

    return result
  }

  if (routed.intent === "stop_timer") {
    const result = await stopTimer({
      task_name: mergedDraft.task_name,
      category: mergedDraft.category,
      hashtags: mergedDraft.hashtags,
      notes: mergedDraft.notes,
      mood: mergedDraft.mood,
      effort_level: mergedDraft.effort_level,
      satisfaction: mergedDraft.satisfaction,
      avoidance_marker: mergedDraft.avoidance_marker,
      hyperfocus_marker: mergedDraft.hyperfocus_marker,
      guilt_marker: mergedDraft.guilt_marker,
      novelty_marker: mergedDraft.novelty_marker,
    })

    if (result.type === "stopped") {
      return {
        type: "timer_stopped",
        ack: await makeAck("stopped", mergedDraft.task_name ?? "timer"),
        timeBlock: result.timeBlock,
      }
    }

    if (result.type === "not_running") {
      return { type: "timer_not_running", message: "no timer is running." }
    }

    return result
  }

  if (routed.intent === "analyse_blocks") {
    return {
      type: "analysis",
      message: await analyseBlocks(trimmed, mergedDraft),
    }
  }

  const window = deriveWindow(mergedDraft)
  if (!window) {
    return {
      type: "clarify",
      question: clarificationQuestion(mergedDraft),
      draft: mergedDraft,
    }
  }

  if (!mergedDraft.task_name?.trim()) {
    return {
      type: "clarify",
      question: clarificationQuestion(mergedDraft),
      draft: mergedDraft,
    }
  }

  const result = await saveBlock(draftToSaveInput(mergedDraft, window))

  if (result.type === "saved") {
    return {
      type: "logged",
      ack: await makeAck("logged", mergedDraft.task_name ?? "time block"),
      timeBlock: result.timeBlock,
    }
  }

  if (result.type === "not_found") {
    return { type: "error", message: "time block was not found." }
  }

  return result
}

export const processMessage = processCoachMessage
