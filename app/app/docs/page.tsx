import Link from "next/link"
import { redirect } from "next/navigation"
import {
  ArrowRight,
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
import { createClient } from "@/lib/supabase/server"
import { TopNav } from "@/components/top-nav"
import {
  GLASS_PANEL_STYLE,
  PAPER_INSET_STYLE,
  PRIMARY_BUTTON_STYLE,
} from "@/lib/ui-styles"

interface Feature {
  icon: LucideIcon
  title: string
  body: string
  example?: string
  where?: string // hint about where to find this in the app
}

const FEATURES: Feature[] = [
  {
    icon: Timer,
    title: "timer-first tracking",
    body:
      "start the timer when you begin, stop it when the work is real, then name the block after the fact. start/stop stays low-friction; metadata can wait.",
    example: "tap start → work → tap stop → name the block",
    where: "/app",
  },
  {
    icon: Plus,
    title: "manual add block",
    body:
      "forgot to run the tracker? add a completed block manually, backdate the start/end time, choose a category, and save it into the same record.",
    example: "add block → invoice follow-up · admin · 2:00-2:25",
    where: "/app",
  },
  {
    icon: MessageCircle,
    title: "chat logging",
    body:
      "chat is a secondary input surface. tell alibi what happened in plain language and it writes a structured time block, not a legacy freeform entry.",
    example: "you: 'worked on the migration from 10 to 11:30, deep work' → one time block",
    where: "/app",
  },
  {
    icon: Sparkles,
    title: "clarifying parser",
    body:
      "if a chat log is missing the essentials, alibi keeps the draft and asks for the missing piece instead of guessing.",
    example:
      "you: 'worked on client bug' → alibi: 'what time was that, or about how long did it take?'",
  },
  {
    icon: CalendarRange,
    title: "today's block list",
    body:
      "the main app shows today's completed blocks with start/end times, duration, category, notes, hashtags, edit/delete controls, and resume on the latest block.",
    where: "/app",
  },
  {
    icon: LayoutGrid,
    title: "dashboard summaries",
    body:
      "the dashboard reads the same time_blocks data to summarize categories, rhythms, effort markers, and saved work patterns.",
    where: "/app/dashboard",
  },
  {
    icon: Heart,
    title: "check-in mode",
    body:
      "ask 'what did i do today?' or say you're spiraling, and alibi reflects saved blocks back with warmth and specifics.",
    example:
      "you: 'i feel like i did nothing' → alibi reads back the blocks already on the record.",
  },
  {
    icon: Lock,
    title: "private by default",
    body:
      "row-level security protects your time blocks, active timer, coach messages, and drafts. only you can read your own record.",
  },
  {
    icon: CheckCircle2,
    title: "no todo list",
    body:
      "alibi only tracks what you've done, never what's left. that's not the kind of friend it is.",
  },
]

export default async function DocsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/")

  return (
    <main className="relative min-h-screen w-full text-[#2A1F14]">
      <div className="mx-auto flex min-h-screen max-w-[1280px] flex-col gap-6 p-8">
        <TopNav userEmail={user.email ?? null} />

        <header className="px-2 sm:px-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h1 className="text-[1.6rem] font-semibold tracking-tight text-[#2A1F14]">
              what alibi does
            </h1>
            <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#A89680]">
              the docs
            </span>
          </div>
          <p className="mt-1 max-w-prose text-[13.5px] leading-[1.5] text-[#6B5A47]">
            alibi is a witness, not a coach. it records time blocks through the
            timer, manual add-block flow, and structured chat logging, then reads
            those same blocks back when your brain forgets.
          </p>
        </header>

        {/* Mission / quote-style block */}
        <section className="px-7 py-6" style={PAPER_INSET_STYLE}>
          <p className="text-[15px] leading-[1.6] text-[#2A1F14]">
            built for ADHD minds, executive-dysfunction days, and anyone whose
            brain runs ahead of itself. the goal isn&apos;t productivity. the
            goal is{" "}
            <span className="font-semibold">remembering you were there</span>.
          </p>
        </section>

        {/* Feature grid */}
        <section
          className="grid gap-4 md:grid-cols-2"
          aria-label="features"
        >
          {FEATURES.map((f) => (
            <FeatureCard key={f.title} feature={f} />
          ))}
        </section>

        {/* CTA */}
        <section className="mt-2 flex flex-col items-center gap-3 px-2 py-6 text-center">
          <p className="text-[13px] text-[#6B5A47]">
            ready to put a block on the record?
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Link
              href="/app"
              className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-medium text-white transition-all active:scale-95"
              style={PRIMARY_BUTTON_STYLE}
            >
              open tracker
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.4} />
            </Link>
            <Link
              href="/app/dashboard"
              className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-medium text-[#2A1F14] transition-colors hover:bg-white/40"
              style={{
                background: "rgba(255, 250, 240, 0.55)",
                border: "1px solid rgba(60, 40, 20, 0.12)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
              }}
            >
              see your dashboard
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.4} />
            </Link>
          </div>
        </section>

        <footer className="text-center text-[11px] tracking-[0.04em] text-[#A89680]">
          alibi — for the days you can&apos;t see clearly
        </footer>
      </div>
    </main>
  )
}

function FeatureCard({ feature }: { feature: Feature }) {
  const Icon = feature.icon
  return (
    <article
      className="flex flex-col gap-3 p-5"
      style={GLASS_PANEL_STYLE}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full"
            style={{
              background: "rgba(200, 85, 61, 0.12)",
              color: "#C8553D",
            }}
            aria-hidden="true"
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
          </span>
          <h3 className="text-[14px] font-semibold tracking-tight text-[#2A1F14]">
            {feature.title}
          </h3>
        </div>
        {feature.where && (
          <Link
            href={feature.where}
            className="font-mono text-[10px] tracking-[0.04em] text-[#A89680] transition-colors hover:text-[#C8553D]"
          >
            {feature.where}
          </Link>
        )}
      </div>
      <p className="text-[13.5px] leading-[1.5] text-[#6B5A47]">
        {feature.body}
      </p>
      {feature.example && (
        <p
          className="mt-1 px-3 py-2 font-mono text-[11px] leading-[1.5] tracking-[0.02em] text-[#6B5A47]"
          style={{
            background: "rgba(60, 40, 20, 0.04)",
            borderLeft: "2px solid #C8B89F",
            borderRadius: 4,
          }}
        >
          {feature.example}
        </p>
      )}
    </article>
  )
}
