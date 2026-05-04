"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type {
  ActiveTimer,
  DeleteBlockInput,
  DeleteBlockResult,
  GetActiveTimerResult,
  GetCalendarDataInput,
  GetCalendarDataResult,
  ResumeBlockInput,
  ResumeBlockResult,
  SaveBlockInput,
  SaveBlockResult,
  StopTimerInput,
  StartTimerResult,
  StopTimerResult,
  TimeBlock,
  TimeBlockCategory,
  EffortLevel,
  Mood,
  Satisfaction,
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

const MOODS = ["joyful", "neutral", "flat", "anxious", "guilty", "proud"] satisfies Mood[]
const EFFORT_LEVELS = ["easy", "medium", "hard", "grind"] satisfies EffortLevel[]
const SATISFACTION_LEVELS = [
  "satisfied",
  "mixed",
  "frustrated",
  "unclear",
] satisfies Satisfaction[]

function isTimeBlockCategory(category: unknown): category is TimeBlockCategory {
  if (typeof category !== "string") {
    return false
  }

  return TIME_BLOCK_CATEGORIES.includes(category as TimeBlockCategory)
}

function isMood(value: unknown): value is Mood {
  return typeof value === "string" && (MOODS as readonly string[]).includes(value)
}

function isEffortLevel(value: unknown): value is EffortLevel {
  return typeof value === "string" && (EFFORT_LEVELS as readonly string[]).includes(value)
}

function isSatisfaction(value: unknown): value is Satisfaction {
  return typeof value === "string" && (SATISFACTION_LEVELS as readonly string[]).includes(value)
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
      mood: Mood | null | undefined
      effortLevel: EffortLevel | null | undefined
      satisfaction: Satisfaction | null | undefined
      avoidanceMarker: boolean | undefined
      hyperfocusMarker: boolean | undefined
      guiltMarker: boolean | undefined
      noveltyMarker: boolean | undefined
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
    mood: details.mood === undefined ? undefined : isMood(details.mood) ? details.mood : null,
    effortLevel:
      details.effort_level === undefined
        ? undefined
        : isEffortLevel(details.effort_level)
          ? details.effort_level
          : null,
    satisfaction:
      details.satisfaction === undefined
        ? undefined
        : isSatisfaction(details.satisfaction)
          ? details.satisfaction
          : null,
    avoidanceMarker:
      typeof details.avoidance_marker === "boolean" ? details.avoidance_marker : undefined,
    hyperfocusMarker:
      typeof details.hyperfocus_marker === "boolean" ? details.hyperfocus_marker : undefined,
    guiltMarker: typeof details.guilt_marker === "boolean" ? details.guilt_marker : undefined,
    noveltyMarker:
      typeof details.novelty_marker === "boolean" ? details.novelty_marker : undefined,
  }
}

function validateStopTimerInput(input: StopTimerInput | undefined):
  | {
      type: "valid"
      taskName: string | null
      category: TimeBlockCategory | null
      hashtags: string[]
      notes: string | null
      mood: Mood | null
      effortLevel: EffortLevel | null
      satisfaction: Satisfaction | null
      avoidanceMarker: boolean
      hyperfocusMarker: boolean
      guiltMarker: boolean
      noveltyMarker: boolean
    }
  | {
      type: "error"
      message: string
    } {
  if (input === undefined) {
    return {
      type: "valid",
      taskName: null,
      category: null,
      hashtags: [],
      notes: null,
      mood: null,
      effortLevel: null,
      satisfaction: null,
      avoidanceMarker: false,
      hyperfocusMarker: false,
      guiltMarker: false,
      noveltyMarker: false,
    }
  }

  if (!input || typeof input !== "object") {
    return { type: "error", message: "timer details are invalid." }
  }

  if (input.hashtags !== undefined && !Array.isArray(input.hashtags)) {
    return { type: "error", message: "hashtags are invalid." }
  }

  const taskName = typeof input.task_name === "string" ? input.task_name.trim() : null
  const notes = input.notes?.trim() || null

  if (input.category !== null && input.category !== undefined && !isTimeBlockCategory(input.category)) {
    return { type: "error", message: "category is invalid." }
  }

  return {
    type: "valid",
    taskName: taskName || null,
    category: input.category ?? null,
    hashtags: normalizeHashtags(input.hashtags),
    notes,
    mood: isMood(input.mood) ? input.mood : null,
    effortLevel: isEffortLevel(input.effort_level) ? input.effort_level : null,
    satisfaction: isSatisfaction(input.satisfaction) ? input.satisfaction : null,
    avoidanceMarker: input.avoidance_marker === true,
    hyperfocusMarker: input.hyperfocus_marker === true,
    guiltMarker: input.guilt_marker === true,
    noveltyMarker: input.novelty_marker === true,
  }
}

function validateDeleteBlockInput(input: unknown):
  | {
      type: "valid"
      id: string
    }
  | {
      type: "error"
      message: string
    } {
  if (!input || typeof input !== "object") {
    return { type: "error", message: "time block id is required." }
  }

  const details = input as Partial<DeleteBlockInput>

  if (typeof details.id !== "string" || !details.id.trim()) {
    return { type: "error", message: "time block id is required." }
  }

  return {
    type: "valid",
    id: details.id.trim(),
  }
}

function validateResumeBlockInput(input: unknown):
  | {
      type: "valid"
      id: string
    }
  | {
      type: "error"
      message: string
    } {
  if (!input || typeof input !== "object") {
    return { type: "error", message: "time block id is required." }
  }

  const details = input as Partial<ResumeBlockInput>

  if (typeof details.id !== "string" || !details.id.trim()) {
    return { type: "error", message: "time block id is required." }
  }

  return {
    type: "valid",
    id: details.id.trim(),
  }
}

function validateGetCalendarDataInput(input: unknown):
  | {
      type: "valid"
      start: string
      end: string
    }
  | {
      type: "error"
      message: string
    } {
  if (!input || typeof input !== "object") {
    return { type: "error", message: "date range is required." }
  }

  const details = input as Partial<GetCalendarDataInput>

  if (typeof details.start !== "string" || typeof details.end !== "string") {
    return { type: "error", message: "start and end dates are required." }
  }

  const start = parseBlockDate(details.start)
  const end = parseBlockDate(details.end)

  if (!start || !end) {
    return { type: "error", message: "start and end dates must be valid dates." }
  }

  if (end.getTime() <= start.getTime()) {
    return { type: "error", message: "end date must be after start date." }
  }

  return {
    type: "valid",
    start: start.toISOString(),
    end: end.toISOString(),
  }
}

/**
 * Load the current user's running timer, if one exists.
 */
export async function getActiveTimer(): Promise<GetActiveTimerResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { type: "error", message: "not signed in." }
  }

  const { data: activeTimer, error } = await supabase
    .from("active_timer")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle()

  if (error) {
    return { type: "error", message: "couldn't load the timer. try again." }
  }

  return {
    type: "loaded",
    activeTimer: activeTimer ? (activeTimer as ActiveTimer) : null,
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
 * Reopen a completed block as the active timer, preserving its original start
 * time and metadata.
 */
export async function resumeBlock(input: ResumeBlockInput): Promise<ResumeBlockResult> {
  const validated = validateResumeBlockInput(input)

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

  const { data: block, error: blockError } = await supabase
    .from("time_blocks")
    .select("*")
    .eq("id", validated.id)
    .eq("user_id", user.id)
    .maybeSingle()

  if (blockError) {
    return { type: "error", message: "couldn't load the time block. try again." }
  }

  if (!block) {
    return { type: "not_found" }
  }

  const timeBlock = block as TimeBlock

  if (!timeBlock.ended_at) {
    return { type: "error", message: "that block is already running." }
  }

  const startedAt = new Date(timeBlock.started_at)

  if (Number.isNaN(startedAt.getTime()) || startedAt.getTime() >= Date.now()) {
    return { type: "error", message: "time block has an invalid start time." }
  }

  const { data: activeTimer, error: insertError } = await supabase
    .from("active_timer")
    .insert({
      user_id: user.id,
      started_at: timeBlock.started_at,
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

    return { type: "error", message: "couldn't resume the time block. try again." }
  }

  const { data: reopenedBlock, error: updateError } = await supabase
    .from("time_blocks")
    .update({
      ended_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", timeBlock.id)
    .eq("user_id", user.id)
    .not("ended_at", "is", null)
    .select("id")
    .maybeSingle()

  if (updateError || !reopenedBlock) {
    await supabase
      .from("active_timer")
      .delete()
      .eq("user_id", user.id)
      .eq("started_at", timeBlock.started_at)

    if (!reopenedBlock) {
      return { type: "not_found" }
    }

    return { type: "error", message: "couldn't reopen the time block. try again." }
  }

  revalidatePath("/app")
  revalidatePath("/app/dashboard")

  return {
    type: "resumed",
    activeTimer: activeTimer as ActiveTimer,
  }
}

/**
 * Stop the current user's timer and save the elapsed time as a time block.
 */
export async function stopTimer(input?: StopTimerInput): Promise<StopTimerResult> {
  const validatedInput = validateStopTimerInput(input)

  if (validatedInput.type === "error") {
    return validatedInput
  }

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

  const { data: openBlock, error: openBlockError } = await supabase
    .from("time_blocks")
    .select("*")
    .eq("user_id", user.id)
    .eq("started_at", activeTimer.started_at)
    .is("ended_at", null)
    .maybeSingle()

  if (openBlockError) {
    return { type: "error", message: "couldn't check the running block. try again." }
  }

  let timeBlock: TimeBlock

  if (openBlock) {
    const updateValues: Record<string, unknown> = {
      ended_at: endedAt.toISOString(),
      updated_at: new Date().toISOString(),
    }

    if (input !== undefined) {
      updateValues.task_name = validatedInput.taskName
      updateValues.category = validatedInput.category
      updateValues.hashtags = validatedInput.hashtags
      updateValues.notes = validatedInput.notes
      updateValues.mood = validatedInput.mood
      updateValues.effort_level = validatedInput.effortLevel
      updateValues.satisfaction = validatedInput.satisfaction
      updateValues.avoidance_marker = validatedInput.avoidanceMarker
      updateValues.hyperfocus_marker = validatedInput.hyperfocusMarker
      updateValues.guilt_marker = validatedInput.guiltMarker
      updateValues.novelty_marker = validatedInput.noveltyMarker
    }

    const { data: updatedBlock, error: updateError } = await supabase
      .from("time_blocks")
      .update(updateValues)
      .eq("id", (openBlock as TimeBlock).id)
      .eq("user_id", user.id)
      .select("*")
      .single()

    if (updateError || !updatedBlock) {
      return { type: "error", message: "couldn't save the time block. try again." }
    }

    timeBlock = updatedBlock as TimeBlock
  } else {
    const { data: insertedBlock, error: insertError } = await supabase
      .from("time_blocks")
      .insert({
        user_id: user.id,
        started_at: activeTimer.started_at,
        ended_at: endedAt.toISOString(),
        task_name: validatedInput.taskName,
        category: validatedInput.category,
        hashtags: validatedInput.hashtags,
        notes: validatedInput.notes,
        mood: validatedInput.mood,
        effort_level: validatedInput.effortLevel,
        satisfaction: validatedInput.satisfaction,
        avoidance_marker: validatedInput.avoidanceMarker,
        hyperfocus_marker: validatedInput.hyperfocusMarker,
        guilt_marker: validatedInput.guiltMarker,
        novelty_marker: validatedInput.noveltyMarker,
      })
      .select("*")
      .single()

    if (insertError || !insertedBlock) {
      return { type: "error", message: "couldn't save the time block. try again." }
    }

    timeBlock = insertedBlock as TimeBlock
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
      timeBlock,
    }
  }

  revalidatePath("/app")
  revalidatePath("/app/dashboard")

  return {
    type: "stopped",
    timeBlock,
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

  const values: Record<string, unknown> = {
    task_name: validated.taskName,
    category: validated.category,
    hashtags: validated.hashtags,
    notes: validated.notes,
    started_at: validated.startedAt,
    ended_at: validated.endedAt,
    updated_at: new Date().toISOString(),
  }

  if (validated.mood !== undefined) values.mood = validated.mood
  if (validated.effortLevel !== undefined) values.effort_level = validated.effortLevel
  if (validated.satisfaction !== undefined) values.satisfaction = validated.satisfaction
  if (validated.avoidanceMarker !== undefined) {
    values.avoidance_marker = validated.avoidanceMarker
  }
  if (validated.hyperfocusMarker !== undefined) {
    values.hyperfocus_marker = validated.hyperfocusMarker
  }
  if (validated.guiltMarker !== undefined) values.guilt_marker = validated.guiltMarker
  if (validated.noveltyMarker !== undefined) values.novelty_marker = validated.noveltyMarker

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

    revalidatePath("/app")
    revalidatePath("/app/dashboard")

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

  revalidatePath("/app")
  revalidatePath("/app/dashboard")

  return {
    type: "saved",
    timeBlock: timeBlock as TimeBlock,
  }
}

/**
 * Delete a user-owned time block.
 */
export async function deleteBlock(input: DeleteBlockInput): Promise<DeleteBlockResult> {
  const validated = validateDeleteBlockInput(input)

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

  const { data: timeBlock, error: deleteError } = await supabase
    .from("time_blocks")
    .delete()
    .eq("id", validated.id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle()

  if (deleteError) {
    return { type: "error", message: "couldn't delete the time block. try again." }
  }

  if (!timeBlock) {
    return { type: "not_found" }
  }

  revalidatePath("/app")
  revalidatePath("/app/dashboard")

  return {
    type: "deleted",
    id: validated.id,
  }
}

/**
 * Load completed user-owned time blocks that overlap a half-open date range.
 */
export async function getCalendarData(
  input: GetCalendarDataInput,
): Promise<GetCalendarDataResult> {
  const validated = validateGetCalendarDataInput(input)

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

  const { data: timeBlocks, error } = await supabase
    .from("time_blocks")
    .select("*")
    .eq("user_id", user.id)
    .lt("started_at", validated.end)
    .not("ended_at", "is", null)
    .gt("ended_at", validated.start)
    .order("started_at", { ascending: true })

  if (error) {
    return { type: "error", message: "couldn't load calendar data. try again." }
  }

  return {
    type: "loaded",
    timeBlocks: (timeBlocks ?? []) as TimeBlock[],
  }
}
