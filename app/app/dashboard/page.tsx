import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowRight } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import type { TimeBlock } from "@/lib/types"
import { TopNav } from "@/components/top-nav"
import { CalendarView } from "@/components/dashboard/calendar-view"
import { RhythmChart } from "@/components/dashboard/rhythm-chart"
import { ProjectDistribution } from "@/components/dashboard/project-distribution"
import { StatsOverview } from "@/components/dashboard/stats-overview"
import { AdhdMarkers } from "@/components/dashboard/adhd-markers"
import { GLASS_PANEL_STYLE, PRIMARY_BUTTON_STYLE } from "@/lib/ui-styles"

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

  return (
    <main className="relative min-h-screen w-full text-[#2A1F14]">
      <div className="mx-auto flex min-h-screen max-w-[1280px] flex-col gap-6 p-8">
        <TopNav userEmail={user.email ?? null} />

        <header className="px-2 sm:px-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h1 className="text-[1.6rem] font-semibold tracking-tight text-[#2A1F14]">
              the dashboard
            </h1>
            <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#A89680]">
              what you&apos;ve been doing
            </span>
          </div>
          <p className="mt-1 text-[13.5px] leading-[1.5] text-[#6B5A47]">
            a quiet look back. nothing graded, just shown.
          </p>
        </header>

        {safeBlocks.length === 0 ? (
          <section
            className="flex flex-col items-center justify-center px-8 py-16 text-center"
            style={GLASS_PANEL_STYLE}
          >
            <p className="text-[15px] leading-[1.5] text-[#6B5A47]">
              nothing on the record yet.
            </p>
            <p className="mt-1 text-[13px] text-[#A89680]">
              start a timer, then save the block here.
            </p>
            <Link
              href="/app"
              className="mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-medium text-white transition-all active:scale-95"
              style={PRIMARY_BUTTON_STYLE}
            >
              start tracking
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.4} />
            </Link>
          </section>
        ) : (
          <div className="space-y-5">
            <StatsOverview blocks={safeBlocks} />
            <AdhdMarkers blocks={safeBlocks} />
            <CalendarView blocks={safeBlocks} />
            <div className="grid gap-5 md:grid-cols-2">
              <RhythmChart blocks={safeBlocks} />
              <ProjectDistribution blocks={safeBlocks} />
            </div>
          </div>
        )}

        <footer className="text-center text-[11px] tracking-[0.04em] text-[#A89680]">
          alibi — for the days you can&apos;t see clearly
        </footer>
      </div>
    </main>
  )
}
