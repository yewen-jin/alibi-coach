import type { Entry } from "@/lib/types"
import { totalsFor } from "@/lib/dashboard-data"

interface StatsOverviewProps {
  entries: Entry[]
}

export function StatsOverview({ entries }: StatsOverviewProps) {
  const { totalEntries, distinctDays, totalMinutes } = totalsFor(entries)
  const avgPerActiveDay = distinctDays > 0 ? (totalEntries / distinctDays).toFixed(1) : "0"

  const stats = [
    { label: "things logged", value: totalEntries.toString() },
    { label: "active days", value: distinctDays.toString() },
    { label: "avg per day", value: avgPerActiveDay },
    { label: "tracked time", value: formatMinutes(totalMinutes) },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((s) => (
        <div
          key={s.label}
          className="rounded-xl border border-border bg-card p-4"
        >
          <p className="font-serif text-2xl text-foreground tabular-nums">
            {s.value}
          </p>
          <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
            {s.label}
          </p>
        </div>
      ))}
    </div>
  )
}

function formatMinutes(min: number): string {
  if (min === 0) return "—"
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h}h` : `${h}h${m}m`
}
