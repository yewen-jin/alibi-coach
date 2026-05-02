import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import type { Entry } from "@/lib/types"
import { Header } from "@/components/header"
import { CalendarView } from "@/components/dashboard/calendar-view"
import { RhythmChart } from "@/components/dashboard/rhythm-chart"
import { ProjectDistribution } from "@/components/dashboard/project-distribution"
import { StatsOverview } from "@/components/dashboard/stats-overview"

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const { data: entries } = await supabase
    .from("entries")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  const safeEntries = (entries ?? []) as Entry[]

  return (
    <div className="min-h-screen bg-background">
      <Header userEmail={user.email ?? ""} />

      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl text-foreground">
              your dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              a quiet look back at what you&apos;ve already done.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
            back to chat
          </Link>
        </div>

        {safeEntries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
            <p className="font-serif text-lg text-foreground">
              nothing here yet.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              go drop something in. i&apos;ll be watching.
            </p>
            <Link
              href="/"
              className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90"
            >
              start logging
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            <StatsOverview entries={safeEntries} />
            <CalendarView entries={safeEntries} />
            <div className="grid gap-5 md:grid-cols-2">
              <RhythmChart entries={safeEntries} />
              <ProjectDistribution entries={safeEntries} />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
