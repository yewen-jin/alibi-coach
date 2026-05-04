"use client"

import { useCallback, useEffect, useMemo, useState, useTransition } from "react"
import {
  CalendarDays,
  Clock,
  Loader2,
  Pencil,
  Play,
  RefreshCw,
  Square,
  Trash2,
  X,
} from "lucide-react"
import {
  deleteBlock,
  getActiveTimer,
  getCalendarData,
  saveBlock,
  startTimer,
  stopTimer,
} from "@/app/actions/timer"
import type { ActiveTimer, TimeBlock, TimeBlockCategory } from "@/lib/types"
import { cn } from "@/lib/utils"
import { TopNav } from "./top-nav"

const CATEGORIES = [
  { value: "deep_work", label: "deep work", color: "#C8553D" },
  { value: "admin", label: "admin", color: "#D4A574" },
  { value: "social", label: "social", color: "#6F8E9B" },
  { value: "errands", label: "errands", color: "#8B9D7F" },
  { value: "care", label: "care", color: "#B26F91" },
  { value: "creative", label: "creative", color: "#7A6AAE" },
  { value: "rest", label: "rest", color: "#6B8A7A" },
] satisfies Array<{ value: TimeBlockCategory; label: string; color: string }>

type EditorState = {
  block: TimeBlock
  isNewlyStopped: boolean
  taskName: string
  category: TimeBlockCategory | ""
  hashtags: string
  notes: string
  startedAt: string
  endedAt: string
}

interface TimerTrackerAppProps {
  userEmail: string | null
}

function formatElapsed(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return [hours, minutes, seconds]
    .map((part) => part.toString().padStart(2, "0"))
    .join(":")
}

function getElapsedSeconds(activeTimer: ActiveTimer | null, now: number) {
  if (!activeTimer) {
    return 0
  }

  const startedAt = new Date(activeTimer.started_at).getTime()

  if (Number.isNaN(startedAt)) {
    return 0
  }

  return Math.max(0, Math.floor((now - startedAt) / 1000))
}

function formatDuration(seconds: number | null, start: string, end: string | null) {
  let totalSeconds = seconds

  if (totalSeconds === null && end) {
    totalSeconds = Math.max(
      0,
      Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 1000),
    )
  }

  if (!totalSeconds) {
    return "0m"
  }

  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.round((totalSeconds % 3600) / 60)

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`
  }

  if (hours > 0) {
    return `${hours}h`
  }

  return `${Math.max(1, minutes)}m`
}

function formatTime(value: string | null) {
  if (!value) {
    return "--:--"
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))
}

function formatDateHeading(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date)
}

function toDateTimeLocal(value: string | null) {
  if (!value) {
    return ""
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ""
  }

  const offsetMs = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16)
}

function fromDateTimeLocal(value: string) {
  return new Date(value).toISOString()
}

function getTodayRange() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)
  end.setDate(end.getDate() + 1)

  return {
    start,
    end,
    input: {
      start: start.toISOString(),
      end: end.toISOString(),
    },
  }
}

function parseHashtags(value: string) {
  return value
    .split(/[\s,]+/)
    .map((tag) => tag.trim())
    .filter(Boolean)
}

function createEditorState(block: TimeBlock, isNewlyStopped = false): EditorState {
  return {
    block,
    isNewlyStopped,
    taskName: block.task_name ?? "",
    category: block.category ?? "",
    hashtags: (block.hashtags ?? []).join(" "),
    notes: block.notes ?? "",
    startedAt: toDateTimeLocal(block.started_at),
    endedAt: toDateTimeLocal(block.ended_at),
  }
}

function getCategoryMeta(category: TimeBlockCategory | null) {
  return CATEGORIES.find((item) => item.value === category) ?? {
    value: "admin" as TimeBlockCategory,
    label: "uncategorized",
    color: "#A89680",
  }
}

export function TimerTrackerApp({ userEmail }: TimerTrackerAppProps) {
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null)
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([])
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const today = useMemo(() => getTodayRange(), [])
  const elapsed = getElapsedSeconds(activeTimer, now)

  const loadTracker = useCallback(async () => {
    setError(null)
    const [timerResult, calendarResult] = await Promise.all([
      getActiveTimer(),
      getCalendarData(today.input),
    ])

    if (timerResult.type === "loaded") {
      setActiveTimer(timerResult.activeTimer)
    } else {
      setError(timerResult.message)
    }

    if (calendarResult.type === "loaded") {
      setTimeBlocks(calendarResult.timeBlocks)
    } else {
      setError(calendarResult.message)
    }
  }, [today.input])

  useEffect(() => {
    let mounted = true

    async function hydrate() {
      setLoading(true)
      await loadTracker()
      if (mounted) {
        setLoading(false)
      }
    }

    hydrate()

    return () => {
      mounted = false
    }
  }, [loadTracker])

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [])

  const refreshBlocks = useCallback(async () => {
    const result = await getCalendarData(today.input)

    if (result.type === "loaded") {
      setTimeBlocks(result.timeBlocks)
      return
    }

    setError(result.message)
  }, [today.input])

  const handleStart = () => {
    setError(null)
    startTransition(async () => {
      const result = await startTimer()

      if (result.type === "started" || result.type === "already_running") {
        setActiveTimer(result.activeTimer)
        setNow(Date.now())
        return
      }

      setError(result.message)
    })
  }

  const handleStop = () => {
    setError(null)
    startTransition(async () => {
      const result = await stopTimer()

      if (result.type === "stopped") {
        setActiveTimer(null)
        setEditor(createEditorState(result.timeBlock, true))
        await refreshBlocks()
        return
      }

      if (result.type === "not_running") {
        setActiveTimer(null)
        setError("no timer is running.")
        await refreshBlocks()
        return
      }

      if (result.timeBlock) {
        setEditor(createEditorState(result.timeBlock, true))
        await loadTracker()
      }

      setError(result.message)
    })
  }

  const handleSave = () => {
    if (!editor) {
      return
    }

    setError(null)
    startTransition(async () => {
      if (!editor.taskName.trim()) {
        setError("task name is required.")
        return
      }

      if (!editor.category) {
        setError("category is required.")
        return
      }

      const startedAt = new Date(editor.startedAt)
      const endedAt = new Date(editor.endedAt)

      if (
        Number.isNaN(startedAt.getTime()) ||
        Number.isNaN(endedAt.getTime()) ||
        endedAt.getTime() <= startedAt.getTime()
      ) {
        setError("end time must be after start time.")
        return
      }

      const result = await saveBlock({
        id: editor.block.id,
        task_name: editor.taskName,
        category: editor.category,
        started_at: fromDateTimeLocal(editor.startedAt),
        ended_at: fromDateTimeLocal(editor.endedAt),
        hashtags: parseHashtags(editor.hashtags),
        notes: editor.notes,
      })

      if (result.type === "saved") {
        setEditor(null)
        await refreshBlocks()
        return
      }

      setError(result.type === "not_found" ? "time block was not found." : result.message)
    })
  }

  const handleDelete = (block: TimeBlock) => {
    setError(null)
    startTransition(async () => {
      const result = await deleteBlock({ id: block.id })

      if (result.type === "deleted") {
        if (editor?.block.id === block.id) {
          setEditor(null)
        }

        await refreshBlocks()
        return
      }

      setError(result.type === "not_found" ? "time block was not found." : result.message)
    })
  }

  return (
    <main className="min-h-screen px-4 py-4 text-[#2A1F14] sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <TopNav userEmail={userEmail} />

        <section className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)]">
          <div className="flex flex-col gap-5">
            <section
              className="border border-white/60 bg-[#F8F1E3]/80 p-5 shadow-[0_22px_60px_rgba(42,31,20,0.10)] backdrop-blur"
              style={{ borderRadius: 8 }}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#A89680]">
                    active timer
                  </p>
                  <h1 className="mt-2 text-3xl font-semibold tracking-normal text-[#2A1F14] sm:text-4xl">
                    {formatElapsed(elapsed)}
                  </h1>
                </div>
                <div
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-full",
                    activeTimer ? "bg-[#C8553D]/15 text-[#C8553D]" : "bg-white/55 text-[#8B9D7F]",
                  )}
                >
                  <Clock className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-5 flex items-center gap-3">
                {activeTimer ? (
                  <button
                    type="button"
                    onClick={handleStop}
                    disabled={isPending}
                    className="inline-flex h-11 min-w-32 items-center justify-center gap-2 bg-[#C8553D] px-4 text-sm font-semibold text-white transition hover:bg-[#A9412D] disabled:opacity-55"
                    style={{ borderRadius: 8 }}
                  >
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
                    stop
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStart}
                    disabled={isPending || loading}
                    className="inline-flex h-11 min-w-32 items-center justify-center gap-2 bg-[#2A1F14] px-4 text-sm font-semibold text-white transition hover:bg-[#463421] disabled:opacity-55"
                    style={{ borderRadius: 8 }}
                  >
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                    start
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setLoading(true)
                    loadTracker().finally(() => setLoading(false))
                  }}
                  disabled={isPending || loading}
                  aria-label="refresh timer and blocks"
                  title="refresh"
                  className="inline-flex h-11 w-11 items-center justify-center border border-[#C8B89F]/70 bg-white/45 text-[#6B5A47] transition hover:bg-white/75 disabled:opacity-55"
                  style={{ borderRadius: 8 }}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </button>
              </div>

              <p className="mt-4 text-sm leading-6 text-[#6B5A47]">
                {activeTimer
                  ? `running since ${formatTime(activeTimer.started_at)}`
                  : "start when you begin, stop when the block is real."}
              </p>
            </section>

            {error && (
              <div
                role="alert"
                className="border border-[#C8553D]/30 bg-[#C8553D]/10 px-4 py-3 text-sm text-[#8A2F20]"
                style={{ borderRadius: 8 }}
              >
                {error}
              </div>
            )}

            {editor && (
              <BlockEditor
                editor={editor}
                setEditor={setEditor}
                onSave={handleSave}
                onDelete={() => handleDelete(editor.block)}
                pending={isPending}
              />
            )}
          </div>

          <DailyBlocks
            date={today.start}
            loading={loading}
            blocks={timeBlocks}
            onEdit={(block) => setEditor(createEditorState(block))}
            onDelete={handleDelete}
            pending={isPending}
          />
        </section>
      </div>
    </main>
  )
}

function BlockEditor({
  editor,
  setEditor,
  onSave,
  onDelete,
  pending,
}: {
  editor: EditorState
  setEditor: (editor: EditorState | null) => void
  onSave: () => void
  onDelete: () => void
  pending: boolean
}) {
  return (
    <section
      className="border border-[#C8B89F]/60 bg-white/45 p-5 shadow-[0_18px_48px_rgba(42,31,20,0.08)]"
      style={{ borderRadius: 8 }}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#A89680]">
            block editor
          </p>
          <h2 className="mt-1 text-lg font-semibold text-[#2A1F14]">
            {editor.isNewlyStopped ? "name this block" : "edit block"}
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setEditor(null)}
          aria-label="close editor"
          title="close"
          className="flex h-9 w-9 items-center justify-center text-[#6B5A47] transition hover:bg-white/55 hover:text-[#2A1F14]"
          style={{ borderRadius: 8 }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-5 grid gap-4">
        <label className="grid gap-1.5 text-sm font-medium text-[#2A1F14]">
          task name
          <input
            value={editor.taskName}
            onChange={(event) => setEditor({ ...editor, taskName: event.target.value })}
            className="h-11 border border-[#C8B89F]/70 bg-[#F8F1E3]/80 px-3 text-sm outline-none transition focus:border-[#C8553D]"
            style={{ borderRadius: 8 }}
            placeholder="what happened?"
          />
        </label>

        <label className="grid gap-1.5 text-sm font-medium text-[#2A1F14]">
          category
          <select
            value={editor.category}
            onChange={(event) =>
              setEditor({ ...editor, category: event.target.value as TimeBlockCategory | "" })
            }
            className="h-11 border border-[#C8B89F]/70 bg-[#F8F1E3]/80 px-3 text-sm outline-none transition focus:border-[#C8553D]"
            style={{ borderRadius: 8 }}
          >
            <option value="">choose one</option>
            {CATEGORIES.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-medium text-[#2A1F14]">
            start
            <input
              type="datetime-local"
              value={editor.startedAt}
              onChange={(event) => setEditor({ ...editor, startedAt: event.target.value })}
              className="h-11 border border-[#C8B89F]/70 bg-[#F8F1E3]/80 px-3 text-sm outline-none transition focus:border-[#C8553D]"
              style={{ borderRadius: 8 }}
            />
          </label>

          <label className="grid gap-1.5 text-sm font-medium text-[#2A1F14]">
            end
            <input
              type="datetime-local"
              value={editor.endedAt}
              onChange={(event) => setEditor({ ...editor, endedAt: event.target.value })}
              className="h-11 border border-[#C8B89F]/70 bg-[#F8F1E3]/80 px-3 text-sm outline-none transition focus:border-[#C8553D]"
              style={{ borderRadius: 8 }}
            />
          </label>
        </div>

        <label className="grid gap-1.5 text-sm font-medium text-[#2A1F14]">
          hashtags
          <input
            value={editor.hashtags}
            onChange={(event) => setEditor({ ...editor, hashtags: event.target.value })}
            className="h-11 border border-[#C8B89F]/70 bg-[#F8F1E3]/80 px-3 text-sm outline-none transition focus:border-[#C8553D]"
            style={{ borderRadius: 8 }}
            placeholder="client, writing, reset"
          />
        </label>

        <label className="grid gap-1.5 text-sm font-medium text-[#2A1F14]">
          notes
          <textarea
            value={editor.notes}
            onChange={(event) => setEditor({ ...editor, notes: event.target.value })}
            className="min-h-24 resize-y border border-[#C8B89F]/70 bg-[#F8F1E3]/80 px-3 py-2 text-sm outline-none transition focus:border-[#C8553D]"
            style={{ borderRadius: 8 }}
          />
        </label>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onDelete}
          disabled={pending}
          className="inline-flex h-10 items-center justify-center gap-2 px-3 text-sm font-medium text-[#8A2F20] transition hover:bg-[#C8553D]/10 disabled:opacity-55"
          style={{ borderRadius: 8 }}
        >
          <Trash2 className="h-4 w-4" />
          delete
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEditor(null)}
            disabled={pending}
            className="h-10 px-4 text-sm font-medium text-[#6B5A47] transition hover:bg-white/55 disabled:opacity-55"
            style={{ borderRadius: 8 }}
          >
            cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={pending}
            className="inline-flex h-10 items-center justify-center gap-2 bg-[#8B9D7F] px-4 text-sm font-semibold text-white transition hover:bg-[#718766] disabled:opacity-55"
            style={{ borderRadius: 8 }}
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            save
          </button>
        </div>
      </div>
    </section>
  )
}

function DailyBlocks({
  date,
  loading,
  blocks,
  onEdit,
  onDelete,
  pending,
}: {
  date: Date
  loading: boolean
  blocks: TimeBlock[]
  onEdit: (block: TimeBlock) => void
  onDelete: (block: TimeBlock) => void
  pending: boolean
}) {
  return (
    <section
      className="min-h-[520px] border border-white/60 bg-[#F8F1E3]/70 p-5 shadow-[0_22px_60px_rgba(42,31,20,0.08)]"
      style={{ borderRadius: 8 }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#A89680]">
            today
          </p>
          <h2 className="mt-1 text-xl font-semibold text-[#2A1F14]">
            {formatDateHeading(date)}
          </h2>
        </div>
        <div className="flex h-10 w-10 items-center justify-center bg-white/55 text-[#8B9D7F]" style={{ borderRadius: 8 }}>
          <CalendarDays className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-5">
        {loading ? (
          <div className="flex min-h-72 items-center justify-center text-[#A89680]">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : blocks.length === 0 ? (
          <div className="flex min-h-72 items-center justify-center border border-dashed border-[#C8B89F]/80 bg-white/25 px-6 text-center text-sm leading-6 text-[#6B5A47]" style={{ borderRadius: 8 }}>
            no completed blocks for today yet.
          </div>
        ) : (
          <ol className="grid gap-3">
            {blocks.map((block) => {
              const category = getCategoryMeta(block.category)

              return (
                <li
                  key={block.id}
                  className="grid gap-3 border border-[#C8B89F]/55 bg-white/45 p-4 sm:grid-cols-[7.5rem_minmax(0,1fr)_auto]"
                  style={{ borderRadius: 8 }}
                >
                  <div className="font-mono text-xs leading-6 text-[#6B5A47]">
                    <div>{formatTime(block.started_at)}</div>
                    <div>{formatTime(block.ended_at)}</div>
                    <div className="mt-1 font-sans text-[12px] font-semibold text-[#2A1F14]">
                      {formatDuration(block.duration_seconds, block.started_at, block.ended_at)}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6B5A47]">
                        {category.label}
                      </span>
                    </div>
                    <h3 className="mt-2 break-words text-base font-semibold text-[#2A1F14]">
                      {block.task_name || "unnamed time block"}
                    </h3>
                    {block.notes && (
                      <p className="mt-1 break-words text-sm leading-6 text-[#6B5A47]">
                        {block.notes}
                      </p>
                    )}
                    {block.hashtags && block.hashtags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {block.hashtags.map((hashtag) => (
                          <span
                            key={hashtag}
                            className="bg-[#ECE2D0]/80 px-2 py-1 font-mono text-[11px] text-[#6B5A47]"
                            style={{ borderRadius: 8 }}
                          >
                            #{hashtag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-start gap-1">
                    <button
                      type="button"
                      onClick={() => onEdit(block)}
                      aria-label="edit block"
                      title="edit"
                      className="flex h-9 w-9 items-center justify-center text-[#6B5A47] transition hover:bg-white/70 hover:text-[#2A1F14]"
                      style={{ borderRadius: 8 }}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(block)}
                      disabled={pending}
                      aria-label="delete block"
                      title="delete"
                      className="flex h-9 w-9 items-center justify-center text-[#8A2F20] transition hover:bg-[#C8553D]/10 disabled:opacity-55"
                      style={{ borderRadius: 8 }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </section>
  )
}
