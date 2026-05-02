import type { Entry } from "@/lib/types"
import { totalsFor } from "@/lib/dashboard-data"
import { GLASS_PANEL_STYLE } from "@/lib/ui-styles"

interface StatsOverviewProps {
  entries: Entry[]
}

export function StatsOverview({ entries }: StatsOverviewProps) {
  const { totalEntries, distinctDays, totalMinutes } = totalsFor(entries)
  const avgPerActiveDay =
    distinctDays > 0 ? (totalEntries / distinctDays).toFixed(1) : "0"

  const stats = [
    { label: "things logged", value: totalEntries.toString() },
    { label: "active days", value: distinctDays.toString() },
    { label: "avg per day", value: avgPerActiveDay },
    { label: "tracked time", value: formatMinutes(totalMinutes) },
  ]

  return (
    <section
      className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4 sm:gap-4 sm:p-5"
      style={GLASS_PANEL_STYLE}
      aria-label="summary stats"
    >
      {stats.map((s, i) => (
        <div
          key={s.label}
          className={
            i > 0
              ? "sm:border-l sm:border-[rgba(60,40,20,0.08)] sm:pl-4"
              : ""
          }
        >
          <p className="font-mono text-[1.6rem] font-semibold leading-none tabular-nums tracking-tight text-[#2A1F14]">
            {s.value}
          </p>
          <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#A89680]">
            {s.label}
          </p>
        </div>
      ))}
    </section>
  )
}

function formatMinutes(min: number): string {
  if (min === 0) return "—"
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h}h` : `${h}h${m}m`
}
