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
/*  Demo chat simulation                                               */
/* ------------------------------------------------------------------ */

interface DemoMessage {
  id: string
  role: "user" | "assistant"
  text: string
}

const DEMO_EXCHANGES: { user: string; assistant: string }[] = [
  { user: "made coffee and didn't spill it", assistant: "on the record." },
  { user: "90 min deep work on the migration script", assistant: "filed. solid block." },
  { user: "replied to that email i'd been avoiding", assistant: "the avoided one. noted." },
  { user: "went outside for lunch instead of eating at the desk", assistant: "got it. fresh air counts." },
  { user: "what have i done today?", assistant: "you made coffee, did 90 min of deep work, replied to the avoided email, and took lunch outside. quiet morning but you were there." },
]

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function LandingPage() {
  const [demoMessages, setDemoMessages] = useState<DemoMessage[]>([])
  const [demoInput, setDemoInput] = useState("")
  const [demoExchangeIndex, setDemoExchangeIndex] = useState(0)
  const [isTyping, setIsTyping] = useState(false)
  const chatRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll demo chat
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [demoMessages])

  const handleDemoSend = useCallback(() => {
    const text = demoInput.trim()
    if (!text || isTyping) return

    const exchange = DEMO_EXCHANGES[demoExchangeIndex % DEMO_EXCHANGES.length]
    const userMsg: DemoMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      text: text || exchange.user,
    }

    setDemoMessages((prev) => [...prev, userMsg])
    setDemoInput("")
    setIsTyping(true)

    // Simulate response delay
    setTimeout(() => {
      const assistantMsg: DemoMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        text: exchange.assistant,
      }
      setDemoMessages((prev) => [...prev, assistantMsg])
      setDemoExchangeIndex((i) => i + 1)
      setIsTyping(false)
    }, 800 + Math.random() * 400)
  }, [demoInput, demoExchangeIndex, isTyping])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleDemoSend()
    }
  }

  // Auto-type first message after a delay
  useEffect(() => {
    const timer = setTimeout(() => {
      if (demoMessages.length === 0) {
        setDemoInput(DEMO_EXCHANGES[0].user)
      }
    }, 2000)
    return () => clearTimeout(timer)
  }, [demoMessages.length])

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

        {/* Demo chat panel */}
        <div
          className="w-full max-w-md overflow-hidden"
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
            className="flex h-64 flex-col gap-3 overflow-y-auto px-5 py-4"
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
