"use server"

import { generateText, Output } from "ai"
import { z } from "zod"
import { aiModel } from "@/lib/ai"
import { createClient } from "@/lib/supabase/server"
import { getCalendarData, saveBlock, startTimer, stopTimer } from "./timer"
import type {
  ActiveTimer,
  CoachMessage,
  CoachMessageType,
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
] as const satisfies readonly TimeBlockCategory[]
const MOODS = ["joyful", "neutral", "flat", "anxious", "guilty", "proud"] as const satisfies readonly Mood[]
const EFFORT_LEVELS = ["easy", "medium", "hard", "grind"] as const satisfies readonly EffortLevel[]
const SATISFACTION_LEVELS = [
  "satisfied",
  "mixed",
  "frustrated",
  "unclear",
] as const satisfies readonly Satisfaction[]

const coachDraftSchema = z.object({
  task_name: z.string().nullable(),
  category: z.enum(CATEGORIES).nullable(),
  hashtags: z.array(z.string()),
  notes: z.string().nullable(),
  started_at: z.string().nullable(),
  ended_at: z.string().nullable(),
  duration_minutes: z.number().nullable(),
  mood: z.enum(MOODS).nullable(),
  effort_level: z.enum(EFFORT_LEVELS).nullable(),
  satisfaction: z.enum(SATISFACTION_LEVELS).nullable(),
  avoidance_marker: z.boolean(),
  hyperfocus_marker: z.boolean(),
  guilt_marker: z.boolean(),
  novelty_marker: z.boolean(),
})

const routerSchema = coachDraftSchema.extend({
  intent: z.enum(["log_block", "start_timer", "stop_timer", "analyse_blocks", "clarify"]),
})

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
  (
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
  ) & {
    messages: CoachMessage[]
    hasPendingDraft: boolean
  }

type RouterIntent = "log_block" | "start_timer" | "stop_timer" | "analyse_blocks" | "clarify"

interface RouterOutput extends CoachDraft {
  intent: RouterIntent
}

type CategoryInference = {
  category: TimeBlockCategory | null
  source: "extracted" | "inferred" | "none"
}

type Supabase = Awaited<ReturnType<typeof createClient>>

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

function normalizeDraft(value: unknown): CoachDraft | null {
  const parsed = coachDraftSchema.safeParse(value)

  if (!parsed.success) {
    return null
  }

  return normalizeRouterOutput({ intent: "log_block", ...parsed.data }, "").draft
}

function normalizeRouterOutput(
  parsed: Partial<z.infer<typeof routerSchema>> | null,
  fallbackText: string,
): RouterOutput & { draft: CoachDraft } {
  const intent = parsed?.intent
  const normalizedIntent: RouterIntent =
    intent === "start_timer" ||
    intent === "stop_timer" ||
    intent === "analyse_blocks" ||
    intent === "clarify" ||
    intent === "log_block"
      ? intent
      : "log_block"

  const output: RouterOutput = {
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

  return {
    ...output,
    draft: output,
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

  if (draft.duration_minutes) {
    const endedAt = new Date()
    return {
      startedAt: new Date(endedAt.getTime() - draft.duration_minutes * 60_000).toISOString(),
      endedAt: endedAt.toISOString(),
    }
  }

  return null
}

const CATEGORY_KEYWORDS = {
  deep_work: /\b(code|coding|bug|debug|write|writing|design|deep|client|build|research|draft|strategy|proposal)\b/,
  admin: /\b(email|admin|invoice|invoices|paperwork|forms|planning|schedule|budget|tax|receipt|receipts)\b/,
  social: /\b(meeting|call|coffee|lunch|friend|team|standup|sync|chat|catchup|catch-up)\b/,
  errands: /\b(shop|shopping|grocery|groceries|errand|errands|bank|post office|pickup|pick up|delivery)\b/,
  care: /\b(clean|cook|doctor|therapy|exercise|walk|shower|laundry|meds|meal|dinner|breakfast)\b/,
  creative: /\b(draw|drawing|music|paint|painting|song|photo|creative|sketch|film|video|edit)\b/,
  rest: /\b(rest|nap|sleep|break|recover|recovery|downtime)\b/,
} satisfies Record<TimeBlockCategory, RegExp>

function inferCategoryFromText(text: string): TimeBlockCategory | null {
  const lower = text.toLowerCase()
  const matches = CATEGORIES.filter((category) => CATEGORY_KEYWORDS[category].test(lower))

  return matches.length === 1 ? matches[0] : null
}

function categoryTextForDraft(draft: CoachDraft) {
  return [draft.task_name, draft.notes, ...draft.hashtags].filter(Boolean).join(" ")
}

function resolveCategory(draft: CoachDraft): CategoryInference {
  if (draft.category) {
    return { category: draft.category, source: "extracted" }
  }

  const inferred = inferCategoryFromText(categoryTextForDraft(draft))
  return inferred
    ? { category: inferred, source: "inferred" }
    : { category: null, source: "none" }
}

function draftToSaveInput(
  draft: CoachDraft,
  window: { startedAt: string; endedAt: string },
  category: TimeBlockCategory,
): SaveBlockInput {
  const taskName = draft.task_name?.trim() || "logged work"

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

function formatMessageForPrompt(message: CoachMessage) {
  return `${message.role}: ${message.content}`
}

async function fetchCoachMessagesForUser(supabase: Supabase, userId: string) {
  const { data, error } = await supabase
    .from("coach_messages")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })

  if (error) {
    return { type: "error" as const, message: "couldn't load chat history." }
  }

  return { type: "loaded" as const, messages: (data ?? []) as CoachMessage[] }
}

async function insertCoachMessage(
  supabase: Supabase,
  userId: string,
  values: {
    role: "user" | "assistant"
    content: string
    messageType?: CoachMessageType
    relatedTimeBlockId?: string | null
    metadata?: Record<string, unknown>
  },
) {
  const { data, error } = await supabase
    .from("coach_messages")
    .insert({
      user_id: userId,
      role: values.role,
      content: values.content,
      message_type: values.messageType ?? "chat",
      related_time_block_id: values.relatedTimeBlockId ?? null,
      metadata: values.metadata ?? {},
    })
    .select("*")
    .single()

  if (error || !data) {
    return { type: "error" as const, message: "couldn't save chat history." }
  }

  return { type: "inserted" as const, message: data as CoachMessage }
}

async function getPendingDraft(supabase: Supabase, userId: string) {
  const { data, error } = await supabase
    .from("coach_drafts")
    .select("draft, expires_at")
    .eq("user_id", userId)
    .eq("status", "pending")
    .maybeSingle()

  if (error || !data) {
    return null
  }

  if (data.expires_at && new Date(data.expires_at).getTime() <= Date.now()) {
    await supabase
      .from("coach_drafts")
      .update({ status: "resolved", updated_at: new Date().toISOString() })
      .eq("user_id", userId)
    return null
  }

  return normalizeDraft(data.draft)
}

async function savePendingDraft(supabase: Supabase, userId: string, draft: CoachDraft) {
  await supabase
    .from("coach_drafts")
    .upsert({
      user_id: userId,
      draft,
      status: "pending",
      updated_at: new Date().toISOString(),
      expires_at: null,
    })
}

async function resolvePendingDraft(supabase: Supabase, userId: string) {
  await supabase
    .from("coach_drafts")
    .update({ status: "resolved", updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("status", "pending")
}

async function getMessageState(supabase: Supabase, userId: string) {
  const [messagesResult, pendingDraft] = await Promise.all([
    fetchCoachMessagesForUser(supabase, userId),
    getPendingDraft(supabase, userId),
  ])

  return {
    messages: messagesResult.type === "loaded" ? messagesResult.messages : [],
    hasPendingDraft: pendingDraft !== null,
  }
}

async function withMessageState<T extends Omit<ProcessCoachMessageResult, "messages" | "hasPendingDraft">>(
  supabase: Supabase,
  userId: string,
  result: T,
): Promise<T & { messages: CoachMessage[]; hasPendingDraft: boolean }> {
  const state = await getMessageState(supabase, userId)
  return { ...result, ...state }
}

export async function getCoachMessages(): Promise<CoachMessage[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return []
  }

  const result = await fetchCoachMessagesForUser(supabase, user.id)
  return result.type === "loaded" ? result.messages : []
}

export async function getCoachHasPendingDraft(): Promise<boolean> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return false
  }

  return (await getPendingDraft(supabase, user.id)) !== null
}

async function routeMessage(
  text: string,
  draft: CoachDraft | null | undefined,
  timezone: string | null | undefined,
  recentMessages: CoachMessage[],
): Promise<RouterOutput> {
  try {
    const { output } = await generateText({
      model: aiModel,
      output: Output.object({ schema: routerSchema }),
      prompt: [
        "Classify this Alibi chat message and extract structured time-block data.",
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
        "Recent visible messages:",
        recentMessages.length ? recentMessages.map(formatMessageForPrompt).join("\n") : "(none)",
        `User message: ${text}`,
      ].join("\n"),
    })

    return normalizeRouterOutput(output, text)
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

async function analyseBlocks(
  message: string,
  draft: CoachDraft | null | undefined,
  recentMessages: CoachMessage[],
) {
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
        `Pending draft, if any: ${JSON.stringify(draft ?? null)}`,
        "Recent visible messages:",
        recentMessages.length ? recentMessages.map(formatMessageForPrompt).join("\n") : "(none)",
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

  if (!resolveCategory(draft).category) {
    return "what category should i file it under?"
  }

  return "what else should i add before i log it?"
}

export async function processCoachMessage(
  input: ProcessCoachMessageInput | string,
): Promise<ProcessCoachMessageResult> {
  const text = typeof input === "string" ? input : input.text
  const timezone = typeof input === "string" ? null : input.timezone ?? null
  const trimmed = text.trim()

  if (!trimmed) {
    return { type: "error", message: "say something.", messages: [], hasPendingDraft: false }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { type: "error", message: "not signed in.", messages: [], hasPendingDraft: false }
  }

  const userMessage = await insertCoachMessage(supabase, user.id, {
    role: "user",
    content: trimmed,
  })

  if (userMessage.type === "error") {
    return withMessageState(supabase, user.id, { type: "error", message: userMessage.message })
  }

  const pendingDraft = await getPendingDraft(supabase, user.id)
  const messagesAfterUser = await fetchCoachMessagesForUser(supabase, user.id)
  const recentMessages =
    messagesAfterUser.type === "loaded" ? messagesAfterUser.messages.slice(-6) : [userMessage.message]
  const routed = await routeMessage(trimmed, pendingDraft, timezone, recentMessages)
  const mergedDraft = mergeDraft(pendingDraft, routed)

  const finishWithAssistant = async <T extends Omit<ProcessCoachMessageResult, "messages" | "hasPendingDraft">>(
    result: T,
    content: string,
    messageType: CoachMessageType,
    relatedTimeBlockId: string | null = null,
    metadata: Record<string, unknown> = {},
  ) => {
    await insertCoachMessage(supabase, user.id, {
      role: "assistant",
      content,
      messageType,
      relatedTimeBlockId,
      metadata,
    })

    return withMessageState(supabase, user.id, result)
  }

  if (routed.intent === "start_timer") {
    const result = await startTimer()
    if (result.type === "started") {
      await resolvePendingDraft(supabase, user.id)
      const ack = await makeAck("started", mergedDraft.task_name ?? "timer")
      return finishWithAssistant(
        {
          type: "timer_started",
          ack,
          activeTimer: result.activeTimer,
        },
        ack,
        "ack",
      )
    }

    if (result.type === "already_running") {
      await resolvePendingDraft(supabase, user.id)
      return finishWithAssistant(
        {
          type: "timer_already_running",
          ack: "timer already running.",
          activeTimer: result.activeTimer,
        },
        "timer already running.",
        "ack",
      )
    }

    return finishWithAssistant(result, result.message, "error")
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
      await resolvePendingDraft(supabase, user.id)
      const ack = await makeAck("stopped", mergedDraft.task_name ?? "timer")
      return finishWithAssistant(
        {
          type: "timer_stopped",
          ack,
          timeBlock: result.timeBlock,
        },
        ack,
        "ack",
        result.timeBlock.id,
      )
    }

    if (result.type === "not_running") {
      return finishWithAssistant(
        { type: "timer_not_running", message: "no timer is running." },
        "no timer is running.",
        "error",
      )
    }

    return finishWithAssistant(result, result.message, "error", result.timeBlock?.id ?? null)
  }

  if (routed.intent === "analyse_blocks") {
    const message = await analyseBlocks(trimmed, mergedDraft, recentMessages)
    return finishWithAssistant(
      {
        type: "analysis",
        message,
      },
      message,
      "analysis",
    )
  }

  const window = deriveWindow(mergedDraft)
  if (!window) {
    const question = clarificationQuestion(mergedDraft)
    await savePendingDraft(supabase, user.id, mergedDraft)
    return finishWithAssistant(
      {
        type: "clarify",
        question,
        draft: mergedDraft,
      },
      question,
      "clarification",
    )
  }

  if (!mergedDraft.task_name?.trim()) {
    const question = clarificationQuestion(mergedDraft)
    await savePendingDraft(supabase, user.id, mergedDraft)
    return finishWithAssistant(
      {
        type: "clarify",
        question,
        draft: mergedDraft,
      },
      question,
      "clarification",
    )
  }

  const category = resolveCategory(mergedDraft).category
  if (!category) {
    const question = clarificationQuestion(mergedDraft)
    await savePendingDraft(supabase, user.id, mergedDraft)
    return finishWithAssistant(
      {
        type: "clarify",
        question,
        draft: mergedDraft,
      },
      question,
      "clarification",
    )
  }

  const result = await saveBlock(draftToSaveInput(mergedDraft, window, category))

  if (result.type === "saved") {
    await resolvePendingDraft(supabase, user.id)
    const ack = await makeAck("logged", mergedDraft.task_name ?? "time block")
    return finishWithAssistant(
      {
        type: "logged",
        ack,
        timeBlock: result.timeBlock,
      },
      ack,
      "ack",
      result.timeBlock.id,
    )
  }

  if (result.type === "not_found") {
    return finishWithAssistant(
      { type: "error", message: "time block was not found." },
      "time block was not found.",
      "error",
    )
  }

  return finishWithAssistant(result, result.message, "error")
}

export const processMessage = processCoachMessage
