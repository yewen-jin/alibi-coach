"use server"

import { createClient } from "@/lib/supabase/server"
import type {
  ActiveTimer,
  SaveBlockInput,
  SaveBlockResult,
  StartTimerResult,
  StopTimerResult,
  TimeBlock,
  TimeBlockCategory,
} from "@/lib/types"

const TIME_BLOCK_CATEGORIES = [
  "deep_work",
  "admin",
  "social",
  "errands",
  "care",
  "creative",
  "rest",
] satisfies TimeBlockCategory[]

function isTimeBlockCategory(category: unknown): category is TimeBlockCategory {
  if (typeof category !== "string") {
    return false
  }

  return TIME_BLOCK_CATEGORIES.includes(category as TimeBlockCategory)
}

function parseBlockDate(value: string): Date | null {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date
}

function normalizeHashtags(hashtags: string[] | undefined): string[] {
  if (!hashtags) {
    return []
  }

  return hashtags
    .filter((hashtag) => typeof hashtag === "string")
    .map((hashtag) => hashtag.trim().toLowerCase().replace(/^#+/, ""))
    .filter(Boolean)
}

function validateSaveBlockInput(input: unknown):
  | {
      type: "valid"
      id: string | undefined
      taskName: string
      category: TimeBlockCategory
      startedAt: string
      endedAt: string
      hashtags: string[]
      notes: string | null
    }
  | {
      type: "error"
      message: string
    } {
  if (!input || typeof input !== "object") {
    return { type: "error", message: "time block details are invalid." }
  }

  const details = input as Partial<SaveBlockInput>

  if (
    typeof details.task_name !== "string" ||
    typeof details.started_at !== "string" ||
    typeof details.ended_at !== "string"
  ) {
    return { type: "error", message: "time block details are invalid." }
  }

  if (details.hashtags !== undefined && !Array.isArray(details.hashtags)) {
    return { type: "error", message: "hashtags are invalid." }
  }

  if (details.id !== undefined && typeof details.id !== "string") {
    return { type: "error", message: "time block details are invalid." }
  }

  if (details.notes !== undefined && details.notes !== null && typeof details.notes !== "string") {
    return { type: "error", message: "time block details are invalid." }
  }

  const taskName = details.task_name.trim()

  if (!taskName) {
    return { type: "error", message: "task name is required." }
  }

  if (!isTimeBlockCategory(details.category)) {
    return { type: "error", message: "category is invalid." }
  }

  const startedAt = parseBlockDate(details.started_at)
  const endedAt = parseBlockDate(details.ended_at)

  if (!startedAt || !endedAt) {
    return { type: "error", message: "start and end times must be valid dates." }
  }

  if (endedAt.getTime() <= startedAt.getTime()) {
    return { type: "error", message: "end time must be after start time." }
  }

  const notes = details.notes?.trim() || null
  const id = details.id?.trim() || undefined

  return {
    type: "valid",
    id,
    taskName,
    category: details.category,
    startedAt: startedAt.toISOString(),
    endedAt: endedAt.toISOString(),
    hashtags: normalizeHashtags(details.hashtags),
    notes,
  }
}

/**
 * Start the current user's timer without overwriting an existing running timer.
 */
export async function startTimer(): Promise<StartTimerResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { type: "error", message: "not signed in." }
  }

  const { data: existingTimer, error: existingError } = await supabase
    .from("active_timer")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle()

  if (existingError) {
    return { type: "error", message: "couldn't check the timer. try again." }
  }

  if (existingTimer) {
    return {
      type: "already_running",
      activeTimer: existingTimer as ActiveTimer,
    }
  }

  const { data: activeTimer, error: insertError } = await supabase
    .from("active_timer")
    .insert({
      user_id: user.id,
      started_at: new Date().toISOString(),
    })
    .select("*")
    .single()

  if (insertError || !activeTimer) {
    if (insertError?.code === "23505") {
      const { data: timerAfterRace } = await supabase
        .from("active_timer")
        .select("*")
        .eq("user_id", user.id)
        .single()

      if (timerAfterRace) {
        return {
          type: "already_running",
          activeTimer: timerAfterRace as ActiveTimer,
        }
      }
    }

    return { type: "error", message: "couldn't start the timer. try again." }
  }

  return {
    type: "started",
    activeTimer: activeTimer as ActiveTimer,
  }
}

/**
 * Stop the current user's timer and save the elapsed time as a time block.
 */
export async function stopTimer(): Promise<StopTimerResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { type: "error", message: "not signed in." }
  }

  const { data: activeTimer, error: timerError } = await supabase
    .from("active_timer")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle()

  if (timerError) {
    return { type: "error", message: "couldn't check the timer. try again." }
  }

  if (!activeTimer) {
    return { type: "not_running" }
  }

  const endedAt = new Date()
  const startedAt = new Date(activeTimer.started_at)

  if (Number.isNaN(startedAt.getTime()) || endedAt.getTime() <= startedAt.getTime()) {
    return { type: "error", message: "timer has an invalid start time." }
  }

  const { data: timeBlock, error: insertError } = await supabase
    .from("time_blocks")
    .insert({
      user_id: user.id,
      started_at: activeTimer.started_at,
      ended_at: endedAt.toISOString(),
    })
    .select("*")
    .single()

  if (insertError || !timeBlock) {
    return { type: "error", message: "couldn't save the time block. try again." }
  }

  const { error: deleteError } = await supabase
    .from("active_timer")
    .delete()
    .eq("user_id", user.id)
    .eq("started_at", activeTimer.started_at)

  if (deleteError) {
    return {
      type: "error",
      message: "time block saved, but couldn't clear the active timer.",
      timeBlock: timeBlock as TimeBlock,
    }
  }

  return {
    type: "stopped",
    timeBlock: timeBlock as TimeBlock,
  }
}

/**
 * Create or update a user-owned time block with editable metadata and times.
 */
export async function saveBlock(input: SaveBlockInput): Promise<SaveBlockResult> {
  const validated = validateSaveBlockInput(input)

  if (validated.type === "error") {
    return validated
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { type: "error", message: "not signed in." }
  }

  const values = {
    task_name: validated.taskName,
    category: validated.category,
    hashtags: validated.hashtags,
    notes: validated.notes,
    started_at: validated.startedAt,
    ended_at: validated.endedAt,
    updated_at: new Date().toISOString(),
  }

  if (validated.id) {
    const { data: timeBlock, error: updateError } = await supabase
      .from("time_blocks")
      .update(values)
      .eq("id", validated.id)
      .eq("user_id", user.id)
      .select("*")
      .maybeSingle()

    if (updateError) {
      return { type: "error", message: "couldn't save the time block. try again." }
    }

    if (!timeBlock) {
      return { type: "not_found" }
    }

    return {
      type: "saved",
      timeBlock: timeBlock as TimeBlock,
    }
  }

  const { data: timeBlock, error: insertError } = await supabase
    .from("time_blocks")
    .insert({
      ...values,
      user_id: user.id,
    })
    .select("*")
    .single()

  if (insertError || !timeBlock) {
    return { type: "error", message: "couldn't save the time block. try again." }
  }

  return {
    type: "saved",
    timeBlock: timeBlock as TimeBlock,
  }
}
