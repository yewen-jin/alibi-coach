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
  Receipt,
  Sparkles,
  Tags,
  type LucideIcon,
} from "lucide-react"
import {
  GLASS_PANEL_STYLE,
  GLASS_PILL_STYLE,
  PAPER_INSET_STYLE,
  PRIMARY_BUTTON_STYLE,
  ALIBI,
} from "@/lib/ui-styles"

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
    icon: MessageCircle,
    title: "drop-in chat",
    body: "tell alibi what you've done in plain language. no schema, no fields. one message becomes one entry.",
  },
  {
    icon: Sparkles,
    title: "AI parsing",
    body: "alibi extracts project, mood, and duration from each message — so you don't have to format anything.",
  },
  {
    icon: Receipt,
    title: "the receipt",
    body: "today's entries appear on a thermal-paper receipt, time-stamped and grouped. proof you moved.",
  },
  {
    icon: Heart,
    title: "check-in mode",
    body: "ask 'what have i done?' and alibi reads it back with warmth — never a guilt list.",
  },
  {
    icon: CalendarRange,
    title: "calendar dashboard",
    body: "a heatmap of every day you've shown up. light days look as quiet as they were.",
  },
  {
    icon: LayoutGrid,
    title: "rhythm + projects",
    body: "see the days and hours you log most, plus where your time goes by project.",
  },
  {
    icon: Tags,
    title: "proactive messages",
    body: "as your record grows, alibi starts noticing things — quiet patterns, nudges, celebrations.",
  },
  {
    icon: Lock,
    title: "private by default",
    body: "row-level security on every entry. only you can read your own record.",
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
    created_at: now.getTime(),
  }
  entries.unshift(entry)
  // Keep only last 20 entries
  const trimmed = entries.slice(0, 20)
  localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(trimmed))
  return entry
}

function clearDemoEntries(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(DEMO_STORAGE_KEY)
  }
}

// Generate contextual ack responses
function generateDemoAck(content: string): string {
  const lower = content.toLowerCase()
  if (lower.includes("what") && (lower.includes("done") || lower.includes("did"))) {
    const entries = getDemoEntries()
    if (entries.length === 0) return "nothing logged yet. drop in what you've done."
    const summary = entries.slice(0, 5).map((e) => e.content).join(", ")
    return `you've logged: ${summary}. ${entries.length > 5 ? `and ${entries.length - 5} more.` : ""} you were there.`
  }
  const acks = [
    "on the record.",
    "filed.",
    "got it.",
    "noted.",
    "logged.",
    "heard.",
  ]
  // Add contextual flavor
  if (lower.includes("finally") || lower.includes("avoided")) return "the avoided one. noted."
  if (lower.includes("hour") || lower.includes("min")) return "filed. solid block."
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

  // Load demo entries from localStorage on mount
  useEffect(() => {
    setDemoEntries(getDemoEntries())
  }, [])

  // Auto-scroll demo chat
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [demoMessages])

  const handleDemoSend = useCallback(() => {
    const text = demoInput.trim()
    if (!text || isTyping) return

    const userMsg: DemoMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      text,
    }

    setDemoMessages((prev) => [...prev, userMsg])
    setDemoInput("")
    setIsTyping(true)

    // Check if it's a check-in query
    const isCheckIn = text.toLowerCase().includes("what") && 
      (text.toLowerCase().includes("done") || text.toLowerCase().includes("did"))

    // Save to localStorage if it's a drop-in (not a check-in)
    if (!isCheckIn) {
      const newEntry = saveDemoEntry(text)
      setDemoEntries((prev) => [newEntry, ...prev].slice(0, 20))
    }

    // Generate contextual response
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
    <main className="relative min-h-screen w-full text-[#2A1F14]">
      {/* ─────────────────── TOP NAV ─────────────────── */}
      <nav
        className="fixed left-1/2 top-6 z-50 flex -translate-x-1/2 items-center gap-6 px-6 py-3"
        style={GLASS_PILL_STYLE}
      >
        <span className="font-serif text-lg font-medium tracking-tight">alibi</span>
        <div className="h-4 w-px bg-[#C8B89F]" />
        <Link
          href="/auth/login"
          className="flex items-center gap-2 rounded-full px-4 py-1.5 text-[13px] font-medium text-white transition-all hover:scale-105 active:scale-95"
          style={PRIMARY_BUTTON_STYLE}
        >
          sign in
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.4} />
        </Link>
      </nav>

      {/* ─────────────────── HERO ─────────────────── */}
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center gap-10 px-6 pb-16 pt-28">
        {/* Headline */}
        <div className="text-center">
          <h1 className="text-balance font-serif text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
            the friend who remembers
            <br />
            <span style={{ color: ALIBI.terracotta }}>your day</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-[15px] leading-relaxed text-[#6B5A47]">
            alibi is a witness, not a coach. tell it what you did, it remembers,
            and on the days when your brain forgets, it tells you back.
          </p>
        </div>

        {/* Demo panels: Chat + Receipt */}
        <div className="flex w-full max-w-3xl flex-col gap-4 md:flex-row">
          {/* Demo chat panel */}
          <div
            className="flex-1 overflow-hidden"
            style={GLASS_PANEL_STYLE}
          >
            {/* Demo header */}
            <div className="flex items-center justify-between border-b border-[#C8B89F]/30 px-5 py-3">
              <div className="flex items-center gap-2">
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-full text-xs"
                  style={{ background: "rgba(200, 85, 61, 0.15)", color: ALIBI.terracotta }}
                >
                  <MessageCircle className="h-3 w-3" />
                </span>
                <span className="text-[13px] font-medium text-[#2A1F14]">try it out</span>
              </div>
              <span className="text-[10px] uppercase tracking-widest text-[#A89680]">demo</span>
            </div>

            {/* Messages area */}
            <div
              ref={chatRef}
              className="flex h-56 flex-col gap-3 overflow-y-auto px-5 py-4"
              style={PAPER_INSET_STYLE}
            >
              {demoMessages.length === 0 && !isTyping && (
                <p className="text-center text-[13px] text-[#A89680]">
                  type what you did today...
                </p>
              )}
              {demoMessages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed ${
                    m.role === "user"
                      ? "ml-auto bg-[#2A1F14] text-white"
                      : "mr-auto bg-white/70 text-[#2A1F14]"
                  }`}
                  style={
                    m.role === "assistant"
                      ? { boxShadow: "0 1px 3px rgba(60, 40, 20, 0.08)" }
                      : {}
                  }
                >
                  {m.text}
                </div>
              ))}
              {isTyping && (
                <div
                  className="mr-auto flex items-center gap-1.5 rounded-2xl bg-white/70 px-4 py-2.5"
                  style={{ boxShadow: "0 1px 3px rgba(60, 40, 20, 0.08)" }}
                >
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#A89680]" style={{ animationDelay: "0ms" }} />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#A89680]" style={{ animationDelay: "150ms" }} />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#A89680]" style={{ animationDelay: "300ms" }} />
                </div>
              )}
            </div>

            {/* Input */}
            <div className="flex items-end gap-2 border-t border-[#C8B89F]/30 px-4 py-3">
              <textarea
                ref={inputRef}
                value={demoInput}
                onChange={(e) => setDemoInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="made coffee, sent that email..."
                rows={1}
                className="flex-1 resize-none bg-transparent text-[14px] text-[#2A1F14] placeholder:text-[#A89680] focus:outline-none"
                style={{ maxHeight: 80 }}
              />
              <button
                onClick={handleDemoSend}
                disabled={!demoInput.trim() || isTyping}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-40"
                style={PRIMARY_BUTTON_STYLE}
              >
                <ArrowUp className="h-4 w-4" strokeWidth={2.4} />
              </button>
            </div>
          </div>

          {/* Mini receipt panel */}
          <div
            className="w-full overflow-hidden md:w-64"
            style={GLASS_PANEL_STYLE}
          >
            {/* Receipt header */}
            <div className="flex items-center justify-between border-b border-[#C8B89F]/30 px-4 py-3">
              <div className="flex items-center gap-2">
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-full text-xs"
                  style={{ background: "rgba(122, 154, 138, 0.15)", color: ALIBI.sage }}
                >
                  <Receipt className="h-3 w-3" />
                </span>
                <span className="text-[13px] font-medium text-[#2A1F14]">your record</span>
              </div>
              {demoEntries.length > 0 && (
                <button
                  onClick={handleClearDemo}
                  className="text-[10px] text-[#A89680] transition-colors hover:text-[#C8553D]"
                >
                  clear
                </button>
              )}
            </div>

            {/* Entries list */}
            <div
              className="h-56 overflow-y-auto px-4 py-3 md:h-[calc(100%-52px)]"
              style={PAPER_INSET_STYLE}
            >
              {demoEntries.length === 0 ? (
                <p className="text-center text-[12px] text-[#A89680]">
                  entries appear here
                </p>
              ) : (
                <ul className="space-y-2">
                  {demoEntries.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex items-start gap-2 text-[12px]"
                    >
                      <span className="shrink-0 font-mono text-[#A89680]">{entry.time}</span>
                      <span className="text-[#2A1F14]">{entry.content}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Footer note */}
            <div className="border-t border-[#C8B89F]/30 px-4 py-2">
              <p className="text-center text-[10px] text-[#A89680]">
                saved in your browser
              </p>
            </div>
          </div>
        </div>

        {/* CTA buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/auth/sign-up"
            className="flex items-center gap-2 rounded-full px-6 py-3 text-[14px] font-medium text-white transition-all hover:scale-105 active:scale-95"
            style={PRIMARY_BUTTON_STYLE}
          >
            start your record
            <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
          </Link>
          <Link
            href="/auth/login"
            className="flex items-center gap-2 rounded-full border border-[#C8B89F] px-6 py-3 text-[14px] font-medium text-[#2A1F14] transition-colors hover:bg-white/50"
          >
            sign in
          </Link>
        </div>

        {/* Subline */}
        <p className="text-center text-[12px] text-[#A89680]">
          built for ADHD minds, executive-dysfunction days, and anyone whose brain runs ahead of itself.
        </p>
      </section>

      {/* ─────────────────── FEATURES GRID ─────────────────── */}
      <section className="mx-auto max-w-5xl px-6 pb-20">
        <header className="mb-8 text-center">
          <h2 className="font-serif text-2xl font-semibold tracking-tight sm:text-3xl">
            what alibi does
          </h2>
          <p className="mt-2 text-[14px] text-[#6B5A47]">
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
      <footer className="border-t border-[#C8B89F]/30 py-8 text-center">
        <p className="text-[12px] tracking-wide text-[#A89680]">
          alibi — for the days you can&apos;t see clearly
        </p>
      </footer>
    </main>
  )
}

function FeatureCard({ feature }: { feature: Feature }) {
  const Icon = feature.icon
  return (
    <article className="flex flex-col gap-3 p-5" style={GLASS_PANEL_STYLE}>
      <div className="flex items-center gap-2">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-full"
          style={{ background: "rgba(200, 85, 61, 0.12)", color: ALIBI.terracotta }}
        >
          <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
        </span>
        <h3 className="text-[14px] font-semibold tracking-tight text-[#2A1F14]">
          {feature.title}
        </h3>
      </div>
      <p className="text-[13px] leading-relaxed text-[#6B5A47]">{feature.body}</p>
    </article>
  )
}
