"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import Link from "next/link"
import {
  ArrowRight,
  CalendarDays,
  Clock,
  Loader2,
  MessageCircle,
  Pencil,
  Plus,
  Play,
  RotateCcw,
  Send,
  Square,
  Trash2,
  X,
} from "lucide-react"
import {
  clearDemoSession,
  readDemoSession,
  writeDemoSession,
  type DemoStoredBlock,
  type DemoStoredMessage,
  type DemoStoredSession,
} from "@/lib/demo-storage"
import type { TimeBlockCategoryRecord } from "@/lib/types"
import { cn } from "@/lib/utils"

const CATEGORIES = [
  { id: "deep_work", user_id: null, slug: "deep_work", name: "deep work", color: "#3253C7", is_default: true, created_at: "", updated_at: "" },
  { id: "admin", user_id: null, slug: "admin", name: "admin", color: "#93A5E4", is_default: true, created_at: "", updated_at: "" },
  { id: "social", user_id: null, slug: "social", name: "social", color: "#BF7DAD", is_default: true, created_at: "", updated_at: "" },
  { id: "errands", user_id: null, slug: "errands", name: "errands", color: "#43849D", is_default: true, created_at: "", updated_at: "" },
  { id: "care", user_id: null, slug: "care", name: "care", color: "#BF7DAD", is_default: true, created_at: "", updated_at: "" },
  { id: "creative", user_id: null, slug: "creative", name: "creative", color: "#3253C7", is_default: true, created_at: "", updated_at: "" },
  { id: "rest", user_id: null, slug: "rest", name: "rest", color: "#43849D", is_default: true, created_at: "", updated_at: "" },
] satisfies TimeBlockCategoryRecord[]

type DemoActiveTimer = NonNullable<DemoStoredSession["active_timer"]>

type EditorState = {
  block?: DemoStoredBlock
  isNewlyStopped: boolean
  isManual: boolean
  taskName: string
  category: string
  hashtags: string
  notes: string
  startedAt: string
  endedAt: string
}

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function formatElapsed(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return [hours, minutes, seconds]
    .map((part) => part.toString().padStart(2, "0"))
    .join(":")
}

function formatTime(value: string | null) {
  if (!value) return "--:--"

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))
}

function formatChatTimestamp(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return ""

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

function formatDuration(start: string, end: string | null) {
  if (!end) return "0m"

  const seconds = Math.max(0, Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 1000))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.round((seconds % 3600) / 60)

  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h`
  return `${Math.max(1, minutes)}m`
}

function formatDateHeading(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date)
}

function toDateTimeLocal(value: string | null) {
  if (!value) return ""

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""

  const offsetMs = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16)
}

function fromDateTimeLocal(value: string) {
  return new Date(value).toISOString()
}

function parseHashtags(value: string) {
  return value
    .split(/[\s,]+/)
    .map((tag) => tag.replace(/^#/, "").trim())
    .filter(Boolean)
}

function slugifyCategoryName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64)
}

function createManualEditorState(): EditorState {
  const endedAt = new Date()
  const startedAt = new Date(endedAt.getTime() - 30 * 60_000)

  return {
    isNewlyStopped: false,
    isManual: true,
    taskName: "",
    category: "",
    hashtags: "",
    notes: "",
    startedAt: toDateTimeLocal(startedAt.toISOString()),
    endedAt: toDateTimeLocal(endedAt.toISOString()),
  }
}

function createEditorState(block: DemoStoredBlock, isNewlyStopped = false): EditorState {
  return {
    block,
    isNewlyStopped,
    isManual: false,
    taskName: block.task_name ?? "",
    category: block.category ?? "",
    hashtags: block.hashtags.join(" "),
    notes: block.notes ?? "",
    startedAt: toDateTimeLocal(block.started_at),
    endedAt: toDateTimeLocal(block.ended_at),
  }
}

function categoryMeta(category: string | null, categories: TimeBlockCategoryRecord[]) {
  return (
    categories.find((item) => item.slug === category) ?? {
      id: category ?? "uncategorized",
      user_id: null,
      slug: category ?? "uncategorized",
      name: category ? category.replace(/_/g, " ") : "uncategorized",
      color: "#93A5E4",
      is_default: false,
      created_at: "",
      updated_at: "",
    }
  )
}

function makeMessage(role: DemoStoredMessage["role"], text: string): DemoStoredMessage {
  return {
    id: newId(role),
    role,
    text,
    created_at: new Date().toISOString(),
  }
}

function parseDurationMinutes(text: string) {
  const hourMatch = text.match(/\b(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\b/i)
  const minuteMatch = text.match(/\b(\d+)\s*(?:m|min|mins|minute|minutes)\b/i)
  const hours = hourMatch ? Number(hourMatch[1]) * 60 : 0
  const minutes = minuteMatch ? Number(minuteMatch[1]) : 0
  const total = hours + minutes

  return total > 0 ? Math.round(total) : null
}

function inferCategory(text: string) {
  const lower = text.toLowerCase()
  if (/\b(email|invoice|admin|form|paperwork|receipt|tax)\b/.test(lower)) return "admin"
  if (/\b(code|coding|write|writing|design|research|build|bug|deep)\b/.test(lower)) return "deep_work"
  if (/\b(meeting|call|friend|team|sync|chat|coffee)\b/.test(lower)) return "social"
  if (/\b(errand|shop|store|post office|pickup)\b/.test(lower)) return "errands"
  if (/\b(clean|cook|doctor|care|laundry|health)\b/.test(lower)) return "care"
  if (/\b(draw|music|film|edit|creative|photo)\b/.test(lower)) return "creative"
  if (/\b(rest|nap|walk|break|sleep|recover)\b/.test(lower)) return "rest"
  return "deep_work"
}

function cleanTaskName(text: string) {
  return text
    .replace(/\b(log|logged|save|saved|record|recorded|worked on|i worked on|spent)\b/gi, "")
    .replace(/\bfrom\s+\S+\s+(?:to|-)\s+\S+\b/gi, "")
    .replace(/\bfor\s+\d+(?:\.\d+)?\s*(?:h|hr|hrs|hour|hours|m|min|mins|minute|minutes)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80)
}

function createBlockFromChat(text: string): DemoStoredBlock {
  const durationMinutes = parseDurationMinutes(text) ?? 30
  const endedAt = new Date()
  const startedAt = new Date(endedAt.getTime() - durationMinutes * 60_000)
  const taskName = cleanTaskName(text) || "reconstructed block"
  const now = new Date().toISOString()

  return {
    id: newId("demo-block"),
    started_at: startedAt.toISOString(),
    ended_at: endedAt.toISOString(),
    task_name: taskName,
    category: inferCategory(text),
    hashtags: [],
    notes: text,
    created_at: now,
    updated_at: now,
  }
}

export default function DemoPage() {
  const [loaded, setLoaded] = useState(false)
  const [nameInput, setNameInput] = useState("")
  const [name, setName] = useState("")
  const [activeTimer, setActiveTimer] = useState<DemoActiveTimer | null>(null)
  const [blocks, setBlocks] = useState<DemoStoredBlock[]>([])
  const [messages, setMessages] = useState<DemoStoredMessage[]>([])
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [pending, setPending] = useState(false)
  const [chatPending, setChatPending] = useState(false)
  const [hasDraft, setHasDraft] = useState(false)

  const today = useMemo(() => new Date(), [])
  const elapsed = activeTimer
    ? Math.max(0, Math.floor((now - new Date(activeTimer.started_at).getTime()) / 1000))
    : 0

  useEffect(() => {
    const existing = readDemoSession()
    if (existing) {
      setName(existing.name)
      setNameInput(existing.name)
      setActiveTimer(existing.active_timer)
      setBlocks(existing.blocks)
      setMessages(existing.messages)
    }
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (!loaded || !name) return

    writeDemoSession({
      version: 1,
      name,
      active_timer: activeTimer,
      blocks,
      messages,
      updated_at: new Date().toISOString(),
    })
  }, [activeTimer, blocks, loaded, messages, name])

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [])

  const categories = useMemo(() => {
    const custom = Array.from(new Set(blocks.map((block) => block.category).filter(Boolean)))
      .filter((slug): slug is string => !CATEGORIES.some((item) => item.slug === slug))
      .map((slug) => ({
        id: slug,
        user_id: "demo",
        slug,
        name: slug.replace(/_/g, " "),
        color: "#BF7DAD",
        is_default: false,
        created_at: "",
        updated_at: "",
      }))

    return [...CATEGORIES, ...custom]
  }, [blocks])

  const completedBlocks = useMemo(
    () =>
      [...blocks]
        .filter((block) => block.ended_at)
        .sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime()),
    [blocks],
  )

  const handleNameSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = nameInput.trim()
    if (!trimmed) return
    setName(trimmed)
    setMessages((current) =>
      current.length > 0
        ? current
        : [
            makeMessage(
              "assistant",
              `hi ${trimmed}. start the timer, add a block, or tell me what happened in plain language.`,
            ),
          ],
    )
  }

  const handleStart = () => {
    setError(null)
    if (activeTimer) return
    setActiveTimer({ started_at: new Date().toISOString() })
    setNow(Date.now())
  }

  const handleStop = () => {
    setError(null)
    if (!activeTimer) {
      setError("no timer is running.")
      return
    }

    const nowIso = new Date().toISOString()
    const base = activeTimer.resumed_block
    const block: DemoStoredBlock = {
      id: base?.id ?? newId("demo-block"),
      started_at: base?.started_at ?? activeTimer.started_at,
      ended_at: nowIso,
      task_name: base?.task_name ?? null,
      category: base?.category ?? null,
      hashtags: base?.hashtags ?? [],
      notes: base?.notes ?? null,
      created_at: base?.created_at ?? nowIso,
      updated_at: nowIso,
    }

    setActiveTimer(null)
    setBlocks((current) => [block, ...current.filter((item) => item.id !== block.id)])
    setEditor(createEditorState(block, !block.task_name))
  }

  const handleSave = () => {
    if (!editor) return

    setError(null)
    if (!editor.taskName.trim()) {
      setError("task name is required.")
      return
    }
    if (!editor.category.trim()) {
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

    const category = slugifyCategoryName(editor.category)
    if (!category) {
      setError("category is invalid.")
      return
    }

    const nowIso = new Date().toISOString()
    const saved: DemoStoredBlock = {
      id: editor.block?.id ?? newId("demo-block"),
      started_at: fromDateTimeLocal(editor.startedAt),
      ended_at: fromDateTimeLocal(editor.endedAt),
      task_name: editor.taskName.trim(),
      category,
      hashtags: parseHashtags(editor.hashtags),
      notes: editor.notes.trim() || null,
      created_at: editor.block?.created_at ?? nowIso,
      updated_at: nowIso,
    }

    setBlocks((current) => [saved, ...current.filter((block) => block.id !== saved.id)])
    setEditor(null)
  }

  const handleDelete = (block: DemoStoredBlock) => {
    setBlocks((current) => current.filter((item) => item.id !== block.id))
    if (editor?.block?.id === block.id) setEditor(null)
  }

  const handleResume = (block: DemoStoredBlock) => {
    if (activeTimer) return
    setEditor(null)
    setActiveTimer({ started_at: block.started_at, resumed_block: block })
    setBlocks((current) => current.filter((item) => item.id !== block.id))
    setNow(Date.now())
  }

  const handleClear = () => {
    clearDemoSession()
    setName("")
    setNameInput("")
    setActiveTimer(null)
    setBlocks([])
    setMessages([])
    setEditor(null)
    setError(null)
  }

  const handleChat = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || chatPending) return

      const lower = trimmed.toLowerCase()
      setChatPending(true)
      setMessages((current) => [...current, makeMessage("user", trimmed)])
      setHasDraft(false)

      await new Promise((resolve) => window.setTimeout(resolve, 350))

      let assistantText = "got it."

      if (lower.includes("start timer") || lower === "start" || lower.includes("start the timer")) {
        if (!activeTimer) {
          setActiveTimer({ started_at: new Date().toISOString() })
          setNow(Date.now())
          assistantText = "timer started. no need to name it yet."
        } else {
          assistantText = "timer is already running."
        }
      } else if (lower.includes("stop timer") || lower === "stop" || lower.includes("stop the timer")) {
        if (!activeTimer) {
          assistantText = "no timer is running."
        } else {
          handleStop()
          assistantText = "stopped. add the details while it is still fresh."
        }
      } else if (lower.includes("what did") || lower.includes("what have") || lower.includes("patterns")) {
        if (completedBlocks.length === 0) {
          assistantText = "nothing logged yet. start with one honest block."
        } else {
          const summary = completedBlocks
            .slice(-4)
            .map((block) => block.task_name ?? block.notes ?? "unnamed block")
            .join(", ")
          assistantText = `on the record: ${summary}. the notes are the useful part when you want patterns later.`
        }
      } else if (
        lower.includes("worked") ||
        lower.includes("log") ||
        lower.includes("spent") ||
        lower.includes("record")
      ) {
        if (!parseDurationMinutes(trimmed) && !/\bfrom\b.+\b(to|-)\b/i.test(trimmed)) {
          setHasDraft(true)
          assistantText =
            "i can log that. about when was it, or roughly how long did it take?"
        } else {
          const block = createBlockFromChat(trimmed)
          setBlocks((current) => [block, ...current])
          assistantText = "saved as a demo block. edit it if the nuance is off."
        }
      } else {
        assistantText =
          "i can help reconstruct that. try telling me what you intended, what actually happened, and how it felt."
      }

      setMessages((current) => [...current, makeMessage("assistant", assistantText)])
      setChatPending(false)
    },
    [activeTimer, chatPending, completedBlocks],
  )

  if (!loaded) {
    return (
      <main className="alibi-page flex min-h-screen items-center justify-center px-6">
        <Loader2 className="h-5 w-5 animate-spin text-alibi-teal" />
      </main>
    )
  }

  if (!name) {
    return (
      <main className="alibi-page flex min-h-screen items-center justify-center px-6 py-12">
        <section className="alibi-card-pop w-full max-w-md p-7">
          <p className="alibi-label">demo session</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-alibi-blue">
            try alibi without logging in
          </h1>
          <p className="mt-3 text-[14px] leading-6 text-alibi-teal">
            This demo stores data in your browser only. Type a name, then use timer, manual blocks,
            and chat like the authenticated app.
          </p>
          <form onSubmit={handleNameSubmit} className="mt-6 grid gap-3">
            <label className="grid gap-1.5 text-sm font-bold text-alibi-blue">
              your name
              <input
                value={nameInput}
                onChange={(event) => setNameInput(event.target.value)}
                className="alibi-input h-11"
                placeholder="Mina"
                autoFocus
              />
            </label>
            <button
              type="submit"
              disabled={!nameInput.trim()}
              className="alibi-button-primary inline-flex h-11 items-center justify-center gap-2 text-sm disabled:opacity-55"
            >
              start demo
              <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
            </button>
          </form>
          <div className="mt-5 flex justify-center">
            <Link href="/" className="text-sm font-semibold text-alibi-teal hover:text-alibi-pink">
              back to landing
            </Link>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="alibi-page px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <nav className="alibi-pill flex flex-wrap items-center justify-between gap-3 px-5 py-3">
          <div>
            <p className="text-[15px] font-black tracking-tight text-alibi-blue">alibi demo</p>
            <p className="text-xs font-semibold text-alibi-teal">local session for {name}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleClear}
              className="rounded-full px-3 py-2 text-xs font-bold text-alibi-teal transition hover:bg-alibi-pink/10 hover:text-alibi-pink"
            >
              clear demo
            </button>
            <Link
              href="/auth/sign-up?from=demo"
              className="alibi-button-primary inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs"
            >
              create account and keep blocks
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.4} />
            </Link>
          </div>
        </nav>

        <section className="rounded-2xl border-2 border-alibi-lavender/25 bg-white/60 px-4 py-3 text-sm font-semibold leading-6 text-alibi-teal">
          Demo data is stored in localStorage on this device. After sign-up, the real app can import
          completed demo blocks into your account.
        </section>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)]">
          <div className="flex flex-col gap-5">
            <section className="alibi-card-pop relative overflow-hidden p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-xs font-black uppercase tracking-[0.12em] text-alibi-teal">
                    active timer
                  </p>
                  <h1 className="mt-2 text-4xl font-black tracking-normal text-alibi-blue sm:text-5xl">
                    {formatElapsed(elapsed)}
                  </h1>
                </div>
                <div
                  className={cn(
                    "flex h-14 w-14 items-center justify-center rounded-2xl border-2",
                    activeTimer
                      ? "border-alibi-pink/30 bg-alibi-pink/20 text-alibi-pink"
                      : "border-alibi-teal/25 bg-alibi-teal/15 text-alibi-teal",
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
                    disabled={pending}
                    className="inline-flex h-11 min-w-32 items-center justify-center gap-2 rounded-2xl bg-alibi-pink px-4 text-sm font-black text-white shadow-[0_10px_22px_rgba(191,125,173,0.34)] transition hover:-translate-y-0.5 hover:bg-alibi-blue disabled:translate-y-0 disabled:opacity-55"
                  >
                    {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
                    stop
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStart}
                    disabled={pending}
                    className="alibi-button-primary inline-flex h-11 min-w-32 items-center justify-center gap-2 text-sm"
                  >
                    <Play className="h-4 w-4" />
                    start
                  </button>
                )}
              </div>

              <p className="relative mt-4 text-sm font-medium leading-6 text-alibi-teal">
                {activeTimer
                  ? `running since ${formatTime(activeTimer.started_at)}`
                  : "start when you begin, stop when the block is real."}
              </p>
            </section>

            {error && (
              <div
                role="alert"
                className="rounded-2xl border-2 border-alibi-pink/25 bg-alibi-pink/10 px-4 py-3 text-sm font-semibold text-alibi-pink"
              >
                {error}
              </div>
            )}

            {editor && (
              <BlockEditor
                editor={editor}
                categories={categories}
                setEditor={setEditor}
                onSave={handleSave}
                onDelete={editor.block ? () => handleDelete(editor.block!) : undefined}
                pending={pending}
              />
            )}

            <CompanionChatPanel
              messages={messages}
              pending={chatPending}
              hasDraft={hasDraft}
              onSubmit={handleChat}
            />
          </div>

          <DailyBlocks
            date={today}
            blocks={completedBlocks}
            categories={categories}
            canResume={activeTimer === null}
            onAdd={() => setEditor(createManualEditorState())}
            onEdit={(block) => setEditor(createEditorState(block))}
            onDelete={handleDelete}
            onResume={handleResume}
            pending={pending}
          />
        </section>
      </div>
    </main>
  )
}

function CompanionChatPanel({
  messages,
  pending,
  hasDraft,
  onSubmit,
}: {
  messages: DemoStoredMessage[]
  pending: boolean
  hasDraft: boolean
  onSubmit: (text: string) => Promise<void>
}) {
  const [value, setValue] = useState("")
  const latestMessageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    latestMessageRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    })
  }, [messages.length, pending])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = value.trim()
    if (!trimmed || pending) return
    setValue("")
    void onSubmit(trimmed)
  }

  return (
    <section className="alibi-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-xs font-black uppercase tracking-[0.12em] text-alibi-teal">
            alibi
          </p>
          <h2 className="mt-1 text-xl font-black text-alibi-blue">chat log</h2>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-alibi-pink/15 text-alibi-pink">
          <MessageCircle className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-4 flex max-h-80 min-h-44 flex-col gap-3 overflow-y-auto rounded-3xl border-2 border-alibi-lavender/25 bg-alibi-lavender/10 p-3">
        {messages.length === 0 ? (
          <p className="mt-auto text-sm font-semibold leading-6 text-alibi-teal">
            nothing here yet.
          </p>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "max-w-[88%] wrap-break-words rounded-2xl px-3 py-2 text-sm font-semibold leading-6 shadow-sm",
                message.role === "user"
                  ? "ml-auto bg-alibi-blue text-white"
                  : "mr-auto bg-white/85 text-alibi-ink",
              )}
            >
              <p className="whitespace-pre-wrap">{message.text}</p>
              <time
                dateTime={message.created_at}
                className={cn(
                  "mt-1 block font-mono text-[10px] font-black uppercase leading-4",
                  message.role === "user" ? "text-white/70" : "text-alibi-teal/70",
                )}
              >
                {formatChatTimestamp(message.created_at)}
              </time>
            </div>
          ))
        )}
        {pending && (
          <div className="mr-auto inline-flex items-center gap-2 rounded-2xl bg-white/85 px-3 py-2 text-sm font-semibold text-alibi-teal">
            <Loader2 className="h-4 w-4 animate-spin" />
            thinking.
          </div>
        )}
        <div ref={latestMessageRef} />
      </div>

      {hasDraft && (
        <p className="mt-3 text-sm font-bold leading-6 text-alibi-pink">one more detail.</p>
      )}

      <form onSubmit={handleSubmit} className="mt-4 flex items-end gap-2">
        <label className="sr-only" htmlFor="demo-companion-message">
          message alibi
        </label>
        <textarea
          id="demo-companion-message"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault()
              event.currentTarget.form?.requestSubmit()
            }
          }}
          rows={2}
          disabled={pending}
          placeholder="worked on the proposal for 45 minutes..."
          className="alibi-input min-h-11 flex-1 resize-none py-2 leading-6 placeholder:text-alibi-teal/60 disabled:opacity-55"
        />
        <button
          type="submit"
          disabled={!value.trim() || pending}
          aria-label="send message"
          title="send"
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-alibi-teal text-white shadow-[0_10px_22px_rgba(67,132,157,0.28)] transition hover:-translate-y-0.5 hover:bg-alibi-pink disabled:translate-y-0 disabled:opacity-55"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </section>
  )
}

function BlockEditor({
  editor,
  categories,
  setEditor,
  onSave,
  onDelete,
  pending,
}: {
  editor: EditorState
  categories: TimeBlockCategoryRecord[]
  setEditor: (editor: EditorState | null) => void
  onSave: () => void
  onDelete?: () => void
  pending: boolean
}) {
  return (
    <section className="alibi-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-xs font-black uppercase tracking-[0.12em] text-alibi-teal">
            block editor
          </p>
          <h2 className="mt-1 text-xl font-black text-alibi-blue">
            {editor.isNewlyStopped ? "name this block" : editor.isManual ? "add block" : "edit block"}
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setEditor(null)}
          aria-label="close editor"
          title="close"
          className="flex h-9 w-9 items-center justify-center rounded-2xl text-alibi-teal transition hover:-translate-y-0.5 hover:bg-alibi-pink/15 hover:text-alibi-pink"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-5 grid gap-4">
        <label className="grid gap-1.5 text-sm font-bold text-alibi-blue">
          task name
          <input
            value={editor.taskName}
            onChange={(event) => setEditor({ ...editor, taskName: event.target.value })}
            className="alibi-input h-11"
            placeholder="what happened?"
          />
        </label>

        <label className="grid gap-1.5 text-sm font-bold text-alibi-blue">
          category
          <input
            list="demo-time-block-categories"
            value={editor.category}
            onChange={(event) => setEditor({ ...editor, category: event.target.value })}
            className="alibi-input h-11"
            placeholder="choose or add a category"
          />
          <datalist id="demo-time-block-categories">
            {categories.map((category) => (
              <option key={category.id} value={category.slug}>
                {category.name}
              </option>
            ))}
          </datalist>
          <span className="text-xs font-semibold leading-5 text-alibi-teal">
            type a new name to create a demo category.
          </span>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-bold text-alibi-blue">
            start
            <input
              type="datetime-local"
              value={editor.startedAt}
              onChange={(event) => setEditor({ ...editor, startedAt: event.target.value })}
              className="alibi-input h-11"
            />
          </label>

          <label className="grid gap-1.5 text-sm font-bold text-alibi-blue">
            end
            <input
              type="datetime-local"
              value={editor.endedAt}
              onChange={(event) => setEditor({ ...editor, endedAt: event.target.value })}
              className="alibi-input h-11"
            />
          </label>
        </div>

        <label className="grid gap-1.5 text-sm font-bold text-alibi-blue">
          hashtags
          <input
            value={editor.hashtags}
            onChange={(event) => setEditor({ ...editor, hashtags: event.target.value })}
            className="alibi-input h-11"
            placeholder="client, writing, reset"
          />
        </label>

        <label className="grid gap-1.5 text-sm font-bold text-alibi-blue">
          notes - what really happened
          <textarea
            value={editor.notes}
            onChange={(event) => setEditor({ ...editor, notes: event.target.value })}
            className="alibi-input min-h-24 resize-y py-2"
            placeholder="what you intended, what actually happened, what shifted, how it felt"
          />
        </label>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        {onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl px-3 text-sm font-bold text-alibi-pink transition hover:-translate-y-0.5 hover:bg-alibi-pink/10 disabled:translate-y-0 disabled:opacity-55"
          >
            <Trash2 className="h-4 w-4" />
            delete
          </button>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEditor(null)}
            disabled={pending}
            className="h-10 rounded-2xl px-4 text-sm font-bold text-alibi-teal transition hover:-translate-y-0.5 hover:bg-alibi-lavender/15 disabled:translate-y-0 disabled:opacity-55"
          >
            cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={pending}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-alibi-teal px-4 text-sm font-black text-white shadow-[0_10px_22px_rgba(67,132,157,0.28)] transition hover:-translate-y-0.5 hover:bg-alibi-blue disabled:translate-y-0 disabled:opacity-55"
          >
            save
          </button>
        </div>
      </div>
    </section>
  )
}

function DailyBlocks({
  date,
  blocks,
  categories,
  canResume,
  onAdd,
  onEdit,
  onDelete,
  onResume,
  pending,
}: {
  date: Date
  blocks: DemoStoredBlock[]
  categories: TimeBlockCategoryRecord[]
  canResume: boolean
  onAdd: () => void
  onEdit: (block: DemoStoredBlock) => void
  onDelete: (block: DemoStoredBlock) => void
  onResume: (block: DemoStoredBlock) => void
  pending: boolean
}) {
  return (
    <section className="alibi-card min-h-130 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-xs font-black uppercase tracking-[0.12em] text-alibi-teal">
            today
          </p>
          <h2 className="mt-1 text-2xl font-black text-alibi-blue">{formatDateHeading(date)}</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onAdd}
            disabled={pending}
            aria-label="add completed block"
            title="add block"
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-alibi-teal text-white shadow-[0_10px_22px_rgba(67,132,157,0.22)] transition hover:-translate-y-0.5 hover:bg-alibi-blue disabled:translate-y-0 disabled:opacity-55"
          >
            <Plus className="h-4 w-4" />
          </button>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-alibi-lavender/25 text-alibi-blue">
            <CalendarDays className="h-4 w-4" />
          </div>
        </div>
      </div>

      <div className="mt-5">
        {blocks.length === 0 ? (
          <div className="flex min-h-72 items-center justify-center rounded-3xl border-2 border-dashed border-alibi-lavender/60 bg-alibi-lavender/10 px-6 text-center text-sm font-semibold leading-6 text-alibi-teal">
            no completed blocks for today yet.
          </div>
        ) : (
          <ol className="grid gap-3">
            {blocks.map((block, index) => {
              const category = categoryMeta(block.category, categories)
              const isLatestBlock = index === blocks.length - 1

              return (
                <li
                  key={block.id}
                  className="grid gap-3 rounded-3xl border-2 border-alibi-lavender/25 bg-white/80 p-4 shadow-[0_10px_24px_rgba(50,83,199,0.09)] transition hover:-translate-y-0.5 hover:border-alibi-pink/35 sm:grid-cols-[7.5rem_minmax(0,1fr)_auto]"
                >
                  <div className="font-mono text-sm font-semibold leading-6 text-alibi-teal">
                    <div>{formatTime(block.started_at)}</div>
                    <div>{formatTime(block.ended_at)}</div>
                    <div className="mt-1 font-sans text-sm font-black text-alibi-blue">
                      {formatDuration(block.started_at, block.ended_at)}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="text-sm font-black uppercase tracking-[0.08em] text-alibi-teal">
                        {category.name}
                      </span>
                    </div>
                    <h3 className="mt-2 wrap-break-words text-base font-black text-alibi-ink">
                      {block.task_name || "unnamed time block"}
                    </h3>
                    {block.notes && (
                      <p className="mt-1 wrap-break-words text-sm font-medium leading-6 text-alibi-teal">
                        {block.notes}
                      </p>
                    )}
                    {block.hashtags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {block.hashtags.map((hashtag) => (
                          <span key={hashtag} className="alibi-chip">
                            #{hashtag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-start gap-1">
                    {isLatestBlock && canResume && (
                      <button
                        type="button"
                        onClick={() => onResume(block)}
                        disabled={pending}
                        aria-label="resume latest block"
                        title="resume"
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-2xl bg-alibi-teal px-3 text-xs font-black text-white shadow-[0_8px_18px_rgba(67,132,157,0.22)] transition hover:-translate-y-0.5 hover:bg-alibi-blue disabled:translate-y-0 disabled:opacity-55"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        resume
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onEdit(block)}
                      aria-label="edit block"
                      title="edit"
                      className="flex h-9 w-9 items-center justify-center rounded-2xl text-alibi-teal transition hover:-translate-y-0.5 hover:bg-alibi-lavender/20 hover:text-alibi-blue"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(block)}
                      disabled={pending}
                      aria-label="delete block"
                      title="delete"
                      className="flex h-9 w-9 items-center justify-center rounded-2xl text-alibi-pink transition hover:-translate-y-0.5 hover:bg-alibi-pink/10 disabled:translate-y-0 disabled:opacity-55"
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
