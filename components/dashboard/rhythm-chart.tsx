"use client"

import { useMemo } from "react"
import type { Entry } from "@/lib/types"
import { aggregateByHour, aggregateByWeekday } from "@/lib/dashboard-data"
import { GLASS_PANEL_STYLE } from "@/lib/ui-styles"

interface RhythmChartProps {
  entries: Entry[]
}

export function RhythmChart({ entries }: RhythmChartProps) {
  const weekday = useMemo(() => aggregateByWeekday(entries), [entries])
  const hour = useMemo(() => aggregateByHour(entries), [entries])

  const maxWeekday = Math.max(...weekday.map((w) => w.count), 1)
  const maxHour = Math.max(...hour.map((h) => h.count), 1)

  return (
    <section className="p-5" style={GLASS_PANEL_STYLE}>
      <div className="mb-4 flex items-baseline gap-3">
        <h2 className="text-[16px] font-semibold tracking-tight text-[#2A1F14]">
          your rhythm
        </h2>
        <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#A89680]">
          when you log
        </span>
      </div>

      <div className="space-y-5">
        {/* Day of week */}
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6B5A47]">
            by day of week
          </p>
          <div className="flex h-24 items-end gap-2" role="presentation">
            {weekday.map((w) => {
              const height = (w.count / maxWeekday) * 100
              return (
                <div
                  key={w.weekday}
                  className="flex flex-1 flex-col items-center gap-1.5"
                >
                  <div className="relative flex h-full w-full items-end">
                    <div
                      className="w-full rounded-t-md transition-all"
                      style={{
                        height: `${Math.max(height, w.count > 0 ? 4 : 0)}%`,
                        background:
                          w.count > 0
                            ? "linear-gradient(180deg, rgba(200,85,61,0.9), rgba(200,85,61,0.65))"
                            : "transparent",
                      }}
                      title={`${w.label}: ${w.count} entries`}
                    />
                  </div>
                  <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#A89680]">
                    {w.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Hour of day */}
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6B5A47]">
            by hour
          </p>
          <div className="flex h-16 items-end gap-[2px]" role="presentation">
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
                      className="w-full rounded-sm"
                      style={{
                        height: `${Math.max(height, h.count > 0 ? 6 : 0)}%`,
                        background:
                          h.count > 0
                            ? "linear-gradient(180deg, rgba(139,157,127,0.9), rgba(139,157,127,0.55))"
                            : "transparent",
                      }}
                      title={`${formatHour(h.hour)}: ${h.count} entries`}
                    />
                  </div>
                  {showLabel && (
                    <span className="font-mono text-[9px] tabular-nums text-[#A89680]">
                      {formatHour(h.hour)}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

function formatHour(h: number): string {
  if (h === 0) return "12a"
  if (h === 12) return "12p"
  return h < 12 ? `${h}a` : `${h - 12}p`
}
