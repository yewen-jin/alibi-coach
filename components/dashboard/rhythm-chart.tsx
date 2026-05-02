"use client"

import { useMemo } from "react"
import type { Entry } from "@/lib/types"
import { aggregateByHour, aggregateByWeekday } from "@/lib/dashboard-data"

interface RhythmChartProps {
  entries: Entry[]
}

export function RhythmChart({ entries }: RhythmChartProps) {
  const weekday = useMemo(() => aggregateByWeekday(entries), [entries])
  const hour = useMemo(() => aggregateByHour(entries), [entries])

  const maxWeekday = Math.max(...weekday.map((w) => w.count), 1)
  const maxHour = Math.max(...hour.map((h) => h.count), 1)

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="mb-4 font-serif text-lg text-foreground">your rhythm</h2>

      <div className="space-y-5">
        <div>
          <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
            by day of week
          </p>
          <div className="flex items-end gap-2 h-24">
            {weekday.map((w) => {
              const height = (w.count / maxWeekday) * 100
              return (
                <div
                  key={w.weekday}
                  className="flex flex-1 flex-col items-center gap-1.5"
                >
                  <div className="relative flex h-full w-full items-end">
                    <div
                      className="w-full rounded-t-md bg-primary/70 transition-all"
                      style={{ height: `${Math.max(height, w.count > 0 ? 4 : 0)}%` }}
                      title={`${w.label}: ${w.count} entries`}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {w.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
            by hour
          </p>
          <div className="flex items-end gap-[2px] h-16">
            {hour.map((h) => {
              const height = (h.count / maxHour) * 100
              const showLabel = h.hour % 6 === 0
              return (
                <div
                  key={h.hour}
                  className="flex flex-1 flex-col items-center gap-1"
                >
                  <div className="relative flex h-full w-full items-end">
                    <div
                      className="w-full rounded-sm bg-coach-text/60"
                      style={{
                        height: `${Math.max(height, h.count > 0 ? 6 : 0)}%`,
                      }}
                      title={`${formatHour(h.hour)}: ${h.count} entries`}
                    />
                  </div>
                  {showLabel && (
                    <span className="text-[9px] tabular-nums text-muted-foreground">
                      {formatHour(h.hour)}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function formatHour(h: number): string {
  if (h === 0) return "12a"
  if (h === 12) return "12p"
  return h < 12 ? `${h}a` : `${h - 12}p`
}
