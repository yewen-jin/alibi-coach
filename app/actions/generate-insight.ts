"use server"

/**
 * Insight generator agent.
 *
 * Run after a successful drop-in to decide whether Alibi should *spontaneously*
 * say something — and, if so, write it. Three small "agents" inline:
 *   1. fetcher  — reads recent entries and the last proactive message
 *   2. parser   — summarizes patterns into a structured profile
 *   3. writer   — produces a single short, warm message in Alibi's voice
 *
 * The cadence rule (in lib/cadence.ts) gates whether the writer runs at all.
 */

import { generateText } from "ai"
import { coachModel, extractJSON } from "@/lib/ai"
import { createClient } from "@/lib/supabase/server"
import { decideCadence } from "@/lib/cadence"
import type { Entry, ProactiveMessage, ProactiveKind } from "@/lib/types"

interface PatternProfile {
  totalEntries: number
  recentEntries: Entry[]
  topProjects: { project: string; count: number }[]
  topWeekday: { label: string; count: number } | null
  topHourBlock: { label: string; count: number } | null
  daysActiveLast7: number
}

const WEEKDAY_LABELS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]

function hourBlock(h: number): string {
  if (h < 5) return "late night"
  if (h < 12) return "morning"
  if (h < 17) return "afternoon"
  if (h < 21) return "evening"
  return "night"
}

/** Agent 1: fetcher — pull the data we need to reason about patterns. */
async function fetchContext(userId: string) {
  const supabase = await createClient()

  const [{ data: entries }, { data: lastProactive, count: totalCount }] =
    await Promise.all([
      supabase
        .from("entries")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(60),
      supabase
        .from("proactive_messages")
        .select("*", { count: "exact" })
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

  const { count: totalEntriesCount } = await supabase
    .from("entries")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)

  return {
    recentEntries: (entries ?? []) as Entry[],
    lastProactive: lastProactive as ProactiveMessage | null,
    totalEntries: totalEntriesCount ?? 0,
    totalProactive: totalCount ?? 0,
  }
}

/** Agent 2: parser — boil entries down to a small pattern profile. */
function parsePatterns(entries: Entry[], totalEntries: number): PatternProfile {
  const projectCount = new Map<string, number>()
  const weekdayCount = new Map<number, number>()
  const hourBlockCount = new Map<string, number>()
  const activeDays = new Set<string>()

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000

  for (const e of entries) {
    const date = new Date(e.created_at)
    const dayKey = date.toISOString().slice(0, 10)
    if (date.getTime() >= weekAgo) activeDays.add(dayKey)

    if (e.project) {
      const key = e.project.trim().toLowerCase()
      projectCount.set(key, (projectCount.get(key) ?? 0) + 1)
    }
    weekdayCount.set(
      date.getDay(),
      (weekdayCount.get(date.getDay()) ?? 0) + 1
    )
    const block = hourBlock(date.getHours())
    hourBlockCount.set(block, (hourBlockCount.get(block) ?? 0) + 1)
  }

  const topProjects = Array.from(projectCount.entries())
    .map(([project, count]) => ({ project, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)

  const topWeekdayEntry = Array.from(weekdayCount.entries()).sort(
    (a, b) => b[1] - a[1]
  )[0]
  const topWeekday = topWeekdayEntry
    ? { label: WEEKDAY_LABELS[topWeekdayEntry[0]], count: topWeekdayEntry[1] }
    : null

  const topHourEntry = Array.from(hourBlockCount.entries()).sort(
    (a, b) => b[1] - a[1]
  )[0]
  const topHourBlock = topHourEntry
    ? { label: topHourEntry[0], count: topHourEntry[1] }
    : null

  return {
    totalEntries,
    recentEntries: entries.slice(0, 10),
    topProjects,
    topWeekday,
    topHourBlock,
    daysActiveLast7: activeDays.size,
  }
}

/** Agent 3: writer — produce a single proactive message in Alibi's voice. */
async function writeProactiveMessage(profile: PatternProfile): Promise<{
  content: string
  kind: ProactiveKind
} | null> {
  const profileSummary = [
    `total entries: ${profile.totalEntries}`,
    `active days in last 7: ${profile.daysActiveLast7}`,
    profile.topProjects.length > 0
      ? `top projects: ${profile.topProjects
          .map((p) => `${p.project} (${p.count})`)
          .join(", ")}`
      : "no project tags yet",
    profile.topWeekday
      ? `most active weekday: ${profile.topWeekday.label} (${profile.topWeekday.count})`
      : "",
    profile.topHourBlock
      ? `most active block: ${profile.topHourBlock.label} (${profile.topHourBlock.count})`
      : "",
    "",
    "recent entries (newest first):",
    ...profile.recentEntries
      .slice(0, 8)
      .map((e) => `- ${e.content}${e.project ? ` [${e.project}]` : ""}`),
  ]
    .filter(Boolean)
    .join("\n")

  try {
    const { text } = await generateText({
      model: coachModel,
      system: [
        "You are Alibi: a warm friend who quietly tracks the user's day.",
        "You are about to send the user an UNPROMPTED message — they did not ask.",
        "It must feel like a friend noticing something, not a coach giving feedback.",
        "",
        "Reply with ONE JSON object only, this exact shape:",
        '{ "kind": "insight" | "nudge" | "celebration" | "pattern", "content": "string" }',
        "",
        "Hard rules for content:",
        "- one short paragraph, max 35 words",
        "- lowercase, no emojis, no exclamation marks",
        "- specific — refer to the actual data (a project name, a weekday, a streak)",
        "- never say \"great job\", never lecture, never suggest techniques",
        '- end with a soft period, not a question (unless the question is gentle, e.g. "want to call it a night?")',
        "",
        "kind meanings:",
        "- pattern  = noticing recurring behavior (e.g. \"you do most of [project] in the evenings\")",
        "- insight  = a quiet reframe (e.g. \"that's the third day in a row you've shown up\")",
        '- nudge    = soft reminder (e.g. "you haven\'t logged anything today, no pressure")',
        "- celebration = small acknowledgment, NOT performative (e.g. \"ten things on the record this week. that's real.\")",
        "",
        "Return ONLY the JSON object.",
      ].join("\n"),
      prompt: [
        "Here is the user's pattern profile:",
        profileSummary,
        "",
        "Write the message.",
      ].join("\n"),
    })

    const parsed = extractJSON(text)
    if (!parsed) return null
    const kind = (parsed.kind as ProactiveKind) ?? "insight"
    const content = typeof parsed.content === "string" ? parsed.content.trim() : ""
    if (!content || content.length > 280) return null
    const allowedKinds: ProactiveKind[] = [
      "insight",
      "nudge",
      "celebration",
      "pattern",
    ]
    return {
      kind: allowedKinds.includes(kind) ? kind : "insight",
      content,
    }
  } catch {
    return null
  }
}

/**
 * Public entry point. Called after each successful drop-in.
 * Returns the new ProactiveMessage if one was created, otherwise null.
 */
export async function maybeGenerateProactiveMessage(
  userId: string
): Promise<ProactiveMessage | null> {
  const supabase = await createClient()
  const ctx = await fetchContext(userId)

  const hoursSinceLast = ctx.lastProactive
    ? (Date.now() - new Date(ctx.lastProactive.created_at).getTime()) /
      (1000 * 60 * 60)
    : null

  const entriesSinceLast = ctx.lastProactive
    ? Math.max(
        0,
        ctx.totalEntries - ctx.lastProactive.entries_count_at_creation
      )
    : ctx.totalEntries

  const decision = decideCadence({
    totalEntries: ctx.totalEntries,
    entriesSinceLast,
    hoursSinceLast,
  })

  if (!decision.shouldSpeak) return null

  const profile = parsePatterns(ctx.recentEntries, ctx.totalEntries)
  const written = await writeProactiveMessage(profile)
  if (!written) return null

  const { data: inserted, error } = await supabase
    .from("proactive_messages")
    .insert({
      user_id: userId,
      content: written.content,
      kind: written.kind,
      entries_count_at_creation: ctx.totalEntries,
    })
    .select()
    .single()

  if (error || !inserted) return null
  return inserted as ProactiveMessage
}
