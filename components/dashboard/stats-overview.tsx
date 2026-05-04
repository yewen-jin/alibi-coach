import type { TimeBlock } from "@/lib/types"
import { totalsFor } from "@/lib/dashboard-data"

interface StatsOverviewProps {
  blocks: TimeBlock[]
}

export function StatsOverview({ blocks }: StatsOverviewProps) {
  const { totalBlocks, distinctDays, totalMinutes } = totalsFor(blocks)
  const avgPerActiveDay =
    distinctDays > 0 ? (totalBlocks / distinctDays).toFixed(1) : "0"

  const stats = [
    { label: "blocks logged", value: totalBlocks.toString() },
    { label: "active days", value: distinctDays.toString() },
    { label: "avg per day", value: avgPerActiveDay },
    { label: "tracked time", value: formatMinutes(totalMinutes) },
  ]

  return (
    <section
      className="alibi-card grid grid-cols-2 gap-3 p-4 sm:grid-cols-4 sm:gap-4 sm:p-5"
      aria-label="summary stats"
    >
      {stats.map((s, i) => (
        <div
          key={s.label}
          className={
            i > 0
              ? "sm:border-l sm:border-alibi-lavender/30 sm:pl-4"
              : ""
          }
        >
          <p className="font-mono text-[1.8rem] font-black leading-none tabular-nums tracking-tight text-alibi-blue">
            {s.value}
          </p>
          <p className="mt-1.5 text-xs font-black uppercase tracking-[0.12em] text-alibi-teal">
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
