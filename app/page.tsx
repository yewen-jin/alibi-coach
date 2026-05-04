"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  ArrowRight,
  ArrowUp,
  CalendarRange,
  CheckCircle2,
  Heart,
  LayoutGrid,
  Lock,
  MessageCircle,
  Plus,
  Sparkles,
  Timer,
  type LucideIcon,
} from "lucide-react"

/* ------------------------------------------------------------------ */
/*  Feature data (from docs)                                           */
/* ------------------------------------------------------------------ */

interface Feature {
  icon: LucideIcon
  title: string
  body: string
}

const FEATURES: Feature[] = [
  {
    icon: Timer,
    title: "timer-first blocks",
    body: "start when you begin, stop when the work is real. alibi saves one editable time block with exact start, end, and duration.",
  },
  {
    icon: Plus,
    title: "manual add block",
    body: "forgot to run the timer? add a completed block by hand, backdate it, and keep the same structure as tracked work.",
  },
  {
    icon: MessageCircle,
    title: "chat can log too",
    body: "tell alibi what happened in plain language. it writes to the same time_blocks table, and asks follow-up questions when details are missing.",
  },
  {
    icon: Sparkles,
    title: "structured AI parsing",
    body: "alibi extracts task, category, timing, tags, notes, and ADHD markers without making a separate shadow record.",
  },
  {
    icon: CalendarRange,
    title: "daily block list",
    body: "today's blocks appear in one place with times, duration, category, notes, hashtags, edit controls, and resume for the latest block.",
  },
  {
    icon: LayoutGrid,
    title: "calendar dashboard",
    body: "the dashboard reads the same blocks for daily, weekly, and monthly time patterns as the calendar grows.",
  },
  {
    icon: Heart,
    title: "check-in mode",
    body: "ask what you did today and alibi reads back saved time blocks with warmth, not a guilt list.",
  },
  {
    icon: Lock,
    title: "private by default",
    body: "row-level security protects your time blocks, timer state, and coach messages. only you can read your own record.",
  },
  {
    icon: CheckCircle2,
    title: "no todo list",
    body: "alibi only tracks what you've done, never what's left. that's not the kind of friend it is.",
  },
]

/* ------------------------------------------------------------------ */
/*  Demo chat simulation with localStorage                             */
/* ------------------------------------------------------------------ */

interface DemoMessage {
  id: string
  role: "user" | "assistant"
  text: string
}

interface DemoEntry {
  id: string
  content: string
  time: string
  duration: string
  created_at: number
}

const DEMO_STORAGE_KEY = "alibi_demo_entries"

function getDemoEntries(): DemoEntry[] {
  if (typeof window === "undefined") return []
  try {
    const stored = localStorage.getItem(DEMO_STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveDemoEntry(content: string): DemoEntry {
  const entries = getDemoEntries()
  const now = new Date()
  const entry: DemoEntry = {
    id: `demo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    content,
    time: now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false }),
    duration: "30m",
    created_at: now.getTime(),
  }
  entries.unshift(entry)
  const trimmed = entries.slice(0, 20)
  localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(trimmed))
  return entry
}

function clearDemoEntries(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(DEMO_STORAGE_KEY)
  }
}

function generateDemoAck(content: string): string {
  const lower = content.toLowerCase()
  if (lower.includes("what") && (lower.includes("done") || lower.includes("did"))) {
    const entries = getDemoEntries()
    if (entries.length === 0) return "nothing logged yet. start the timer or add a block."
    const summary = entries.slice(0, 5).map((e) => e.content).join(", ")
    return `on the record: ${summary}. ${entries.length > 5 ? `and ${entries.length - 5} more.` : ""} you were there.`
  }
  const acks = ["on the record.", "filed.", "got it.", "noted.", "logged.", "heard."]
  if (lower.includes("finally") || lower.includes("avoided")) return "the avoided one. noted."
  if (lower.includes("hour") || lower.includes("min")) return "filed as a block."
  if (lower.includes("coffee") || lower.includes("tea")) return "caffeine logged."
  if (lower.includes("walk") || lower.includes("outside")) return "got it. fresh air counts."
  if (lower.includes("email") || lower.includes("replied")) return "inbox work. noted."
  return acks[Math.floor(Math.random() * acks.length)]
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function LandingPage() {
  const [demoMessages, setDemoMessages] = useState<DemoMessage[]>([])
  const [demoEntries, setDemoEntries] = useState<DemoEntry[]>([])
  const [demoInput, setDemoInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const chatRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setDemoEntries(getDemoEntries())
  }, [])

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [demoMessages])

  const handleDemoSend = useCallback(() => {
    const text = demoInput.trim()
    if (!text || isTyping) return

    const userMsg: DemoMessage = { id: `u-${Date.now()}`, role: "user", text }
    setDemoMessages((prev) => [...prev, userMsg])
    setDemoInput("")
    setIsTyping(true)

    const isCheckIn =
      text.toLowerCase().includes("what") &&
      (text.toLowerCase().includes("done") || text.toLowerCase().includes("did"))

    if (!isCheckIn) {
      const newEntry = saveDemoEntry(text)
      setDemoEntries((prev) => [newEntry, ...prev].slice(0, 20))
    }

    setTimeout(() => {
      const assistantMsg: DemoMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        text: generateDemoAck(text),
      }
      setDemoMessages((prev) => [...prev, assistantMsg])
      setIsTyping(false)
    }, 600 + Math.random() * 400)
  }, [demoInput, isTyping])

  const handleClearDemo = useCallback(() => {
    clearDemoEntries()
    setDemoEntries([])
    setDemoMessages([])
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleDemoSend()
    }
  }

  return (
    <main className="alibi-page relative w-full">
      {/* ─────────────────── TOP NAV ─────────────────── */}
      <nav className="alibi-pill fixed left-1/2 top-6 z-50 flex -translate-x-1/2 items-center gap-6 px-6 py-3">
        <span className="text-[15px] font-black tracking-tight text-alibi-blue">alibi</span>
        <div className="h-4 w-px bg-alibi-lavender/40" />
        <Link
          href="/auth/login"
          className="alibi-button-primary flex items-center gap-2 rounded-full px-4 py-1.5 text-[13px]"
        >
          sign in
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.4} />
        </Link>
      </nav>

      {/* ─────────────────── HERO ─────────────────── */}
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center gap-10 px-6 pb-16 pt-28">
        {/* Headline */}
        <div className="text-center">
          <h1 className="text-balance text-4xl font-black tracking-tight text-alibi-ink sm:text-5xl md:text-6xl">
            the friend who remembers
            <br />
            <span className="text-alibi-pink">your day</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-[15px] leading-relaxed text-alibi-teal">
            alibi is a witness, not a coach. track time with a timer, add blocks by hand, or let
            chat turn plain language into the same structured record.
          </p>
        </div>

        {/* Demo panels: Chat + Record */}
        <div className="flex w-full max-w-3xl flex-col gap-4 md:flex-row">
          {/* Demo chat panel */}
          <div className="alibi-card flex-1 overflow-hidden">
            <div className="flex items-center justify-between border-b border-alibi-blue/10 px-5 py-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-alibi-pink/15 text-alibi-pink text-xs">
                  <MessageCircle className="h-3 w-3" />
                </span>
                <span className="text-[13px] font-medium text-alibi-ink">try chat logging</span>
              </div>
              <span className="alibi-label">demo</span>
            </div>

            <div
              ref={chatRef}
              className="alibi-inset m-3 flex h-52 flex-col gap-3 overflow-y-auto px-4 py-3"
            >
              {demoMessages.length === 0 && !isTyping && (
                <p className="text-center text-[13px] text-alibi-teal/60">
                  try &ldquo;worked on invoice for 20 minutes&rdquo;
                </p>
              )}
              {demoMessages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed ${
                    m.role === "user"
                      ? "ml-auto bg-alibi-blue text-white"
                      : "mr-auto bg-white/70 text-alibi-ink shadow-sm"
                  }`}
                >
                  {m.text}
                </div>
              ))}
              {isTyping && (
                <div className="mr-auto flex items-center gap-1.5 rounded-2xl bg-white/70 px-4 py-2.5 shadow-sm">
                  <span
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-alibi-lavender"
                    style={{ animationDelay: "0ms" }}
                  />
                  <span
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-alibi-lavender"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-alibi-lavender"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
              )}
            </div>

            <div className="flex items-end gap-2 border-t border-alibi-blue/10 px-4 py-3">
              <textarea
                ref={inputRef}
                value={demoInput}
                onChange={(e) => setDemoInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="worked on invoice for 20 minutes..."
                rows={1}
                className="flex-1 resize-none bg-transparent text-[14px] text-alibi-ink placeholder:text-alibi-teal/50 focus:outline-none"
                style={{ maxHeight: 80 }}
              />
              <button
                onClick={handleDemoSend}
                disabled={!demoInput.trim() || isTyping}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-alibi-blue text-white shadow-[0_10px_22px_rgba(50,83,199,0.28)] transition hover:scale-105 active:scale-95 disabled:opacity-40"
              >
                <ArrowUp className="h-4 w-4" strokeWidth={2.4} />
              </button>
            </div>
          </div>

          {/* Mini blocks panel */}
          <div className="alibi-card w-full overflow-hidden md:w-64">
            <div className="flex items-center justify-between border-b border-alibi-blue/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-alibi-teal/15 text-alibi-teal text-xs">
                  <CalendarRange className="h-3 w-3" />
                </span>
                <span className="text-[13px] font-medium text-alibi-ink">time blocks</span>
              </div>
              {demoEntries.length > 0 && (
                <button
                  onClick={handleClearDemo}
                  className="text-[10px] text-alibi-teal/60 transition-colors hover:text-alibi-pink"
                >
                  clear
                </button>
              )}
            </div>

            <div className="alibi-inset m-3 h-52 overflow-y-auto px-3 py-3">
              {demoEntries.length === 0 ? (
                <p className="text-center text-[12px] text-alibi-teal/60">blocks appear here</p>
              ) : (
                <ul className="space-y-2">
                  {demoEntries.map((entry) => (
                    <li key={entry.id} className="flex items-start gap-2 text-[12px]">
                      <span className="shrink-0 font-mono text-alibi-teal/70">{entry.time}</span>
                      <span className="min-w-0 flex-1 text-alibi-ink">{entry.content}</span>
                      <span className="shrink-0 font-mono text-alibi-teal/70">{entry.duration}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t border-alibi-blue/10 px-4 py-2">
              <p className="text-center text-[10px] text-alibi-teal/60">
                demo only · real app saves time_blocks
              </p>
            </div>
          </div>
        </div>

        {/* CTA buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/auth/sign-up"
            className="alibi-button-primary flex items-center gap-2 rounded-full px-6 py-3 text-[14px]"
          >
            start tracking
            <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
          </Link>
          <Link
            href="/auth/login"
            className="alibi-button-secondary flex items-center gap-2 rounded-full px-6 py-3 text-[14px]"
          >
            sign in
          </Link>
        </div>

        {/* Subline */}
        <p className="text-center text-[12px] text-alibi-teal/70">
          built for ADHD minds, executive-dysfunction days, and anyone whose brain runs ahead of
          itself.
        </p>
      </section>

      {/* ─────────────────── FEATURES GRID ─────────────────── */}
      <section className="mx-auto max-w-5xl px-6 pb-20">
        <header className="mb-8 text-center">
          <h2 className="text-2xl font-black tracking-tight text-alibi-ink sm:text-3xl">
            what alibi does
          </h2>
          <p className="mt-2 text-[14px] text-alibi-teal">
            the goal isn&apos;t productivity. the goal is remembering you were there.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <FeatureCard key={f.title} feature={f} />
          ))}
        </div>
      </section>

      {/* ─────────────────── FOOTER ─────────────────── */}
      <footer className="border-t border-alibi-blue/15 py-8 text-center">
        <p className="text-sm font-semibold tracking-[0.04em] text-alibi-teal">
          alibi — for the days you can&apos;t see clearly
        </p>
      </footer>
    </main>
  )
}

function FeatureCard({ feature }: { feature: Feature }) {
  const Icon = feature.icon
  return (
    <article className="alibi-card flex flex-col gap-3 p-5">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-alibi-pink/15 text-alibi-pink">
          <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
        </span>
        <h3 className="text-[14px] font-semibold tracking-tight text-alibi-ink">{feature.title}</h3>
      </div>
      <p className="text-[13px] leading-relaxed text-alibi-teal">{feature.body}</p>
    </article>
  )
}
