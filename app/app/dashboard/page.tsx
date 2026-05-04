import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowRight } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import type { TimeBlock, TimeBlockInsight } from "@/lib/types"
import { TopNav } from "@/components/top-nav"
import { CalendarView } from "@/components/dashboard/calendar-view"
import { RhythmChart } from "@/components/dashboard/rhythm-chart"
import { ProjectDistribution } from "@/components/dashboard/project-distribution"
import { StatsOverview } from "@/components/dashboard/stats-overview"
import { AdhdMarkers } from "@/components/dashboard/adhd-markers"
import { NotesMirror } from "@/components/dashboard/notes-mirror"

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/")

  const { data: timeBlocks } = await supabase
    .from("time_blocks")
    .select("*")
    .eq("user_id", user.id)
    .not("ended_at", "is", null)
    .order("started_at", { ascending: false })

  const safeBlocks = (timeBlocks ?? []) as TimeBlock[]
  const blockIds = safeBlocks.map((block) => block.id)
  const { data: insights } = blockIds.length
    ? await supabase
        .from("time_block_insights")
        .select("*")
        .eq("user_id", user.id)
        .in("time_block_id", blockIds)
    : { data: [] }
  const safeInsights = (insights ?? []) as TimeBlockInsight[]

  return (
    <main className="alibi-page relative w-full">
      <div className="mx-auto flex min-h-screen max-w-[1280px] flex-col gap-6 p-8">
        <TopNav userEmail={user.email ?? null} />

        <header className="px-2 sm:px-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h1 className="text-[1.8rem] font-black tracking-tight text-alibi-blue">
              the dashboard
            </h1>
            <span className="rounded-full bg-alibi-pink/15 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-alibi-pink">
              what you&apos;ve been doing
            </span>
          </div>
          <p className="mt-1 text-base font-semibold leading-relaxed text-alibi-teal">
            a quiet look back. nothing graded, just shown.
          </p>
        </header>

        {safeBlocks.length === 0 ? (
          <section
            className="alibi-card-pop flex flex-col items-center justify-center px-8 py-16 text-center"
          >
            <p className="text-[15px] font-bold leading-[1.5] text-alibi-blue">
              nothing on the record yet.
            </p>
            <p className="mt-1 text-base font-semibold text-alibi-teal">
              start a timer, then save the block here.
            </p>
            <Link
              href="/app"
              className="alibi-button-primary mt-6 inline-flex items-center gap-2 py-2.5 text-base active:scale-95"
            >
              start tracking
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.4} />
            </Link>
          </section>
        ) : (
          <div className="space-y-5">
            <StatsOverview blocks={safeBlocks} />
            <NotesMirror blocks={safeBlocks} insights={safeInsights} />
            <AdhdMarkers blocks={safeBlocks} insights={safeInsights} />
            <CalendarView blocks={safeBlocks} />
            <div className="grid gap-5 md:grid-cols-2">
              <RhythmChart blocks={safeBlocks} />
              <ProjectDistribution blocks={safeBlocks} />
            </div>
          </div>
        )}

        <footer className="text-center text-sm font-semibold tracking-[0.04em] text-alibi-teal">
          alibi — for the days you can&apos;t see clearly
        </footer>
      </div>
    </main>
  )
}
