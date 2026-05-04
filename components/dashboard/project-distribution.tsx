"use client"

import { useMemo } from "react"
import type { TimeBlock } from "@/lib/types"
import { aggregateByCategory } from "@/lib/dashboard-data"
import { GLASS_PANEL_STYLE } from "@/lib/ui-styles"

interface ProjectDistributionProps {
  blocks: TimeBlock[]
}

// Warm categorical palette — drawn from Alibi's accents.
// Deliberately purple-free; sorted from most-to-least saturated.
const PROJECT_COLORS = [
  "#C8553D", // terracotta
  "#8B9D7F", // sage
  "#D4A574", // ochre
  "#7E8C7B", // deep sage
  "#B5A898", // warm taupe
  "#8B95A8", // warm slate
  "#C9B87A", // warm wheat
  "#D49B8C", // warm pink
]

export function ProjectDistribution({ blocks }: ProjectDistributionProps) {
  const categories = useMemo(() => aggregateByCategory(blocks), [blocks])
  const total = categories.reduce((sum, category) => sum + category.totalMinutes, 0)

  if (categories.length === 0) {
    return (
      <section className="p-5" style={GLASS_PANEL_STYLE}>
        <h2 className="mb-2 text-[16px] font-semibold tracking-tight text-[#2A1F14]">
          where you spent time
        </h2>
        <p className="text-[13px] text-[#6B5A47]">
          nothing tracked yet.
        </p>
      </section>
    )
  }

  return (
    <section className="p-5" style={GLASS_PANEL_STYLE}>
      <div className="mb-4 flex items-baseline gap-3">
        <h2 className="text-[16px] font-semibold tracking-tight text-[#2A1F14]">
          where you spent time
        </h2>
        <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#A89680]">
          by category
        </span>
      </div>

      {/* Stacked horizontal bar */}
      <div
        className="mb-4 flex h-3 w-full overflow-hidden"
        style={{
          borderRadius: 999,
          background: "rgba(60, 40, 20, 0.06)",
        }}
        role="img"
        aria-label="project distribution bar"
      >
        {categories.map((category, i) => {
          const pct = total > 0 ? (category.totalMinutes / total) * 100 : 0
          if (pct < 1) return null
          return (
            <div
              key={category.category}
              style={{
                width: `${pct}%`,
                background: PROJECT_COLORS[i % PROJECT_COLORS.length],
              }}
              title={`${category.category}: ${formatMinutes(category.totalMinutes)}`}
            />
          )
        })}
      </div>

      {/* Legend / list */}
      <ul className="space-y-2">
        {categories.slice(0, 8).map((category, i) => {
          const pct = total > 0 ? (category.totalMinutes / total) * 100 : 0
          return (
            <li
              key={category.category}
              className="flex items-center gap-3 text-[13px]"
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{
                  background: PROJECT_COLORS[i % PROJECT_COLORS.length],
                }}
                aria-hidden="true"
              />
              <span className="flex-1 capitalize text-[#2A1F14]">
                {category.category}
              </span>
              <span className="font-mono tabular-nums text-[#6B5A47]">
                {formatMinutes(category.totalMinutes)}
              </span>
              <span className="w-10 text-right font-mono tabular-nums text-[#A89680]">
                {pct.toFixed(0)}%
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function formatMinutes(min: number): string {
  if (min <= 0) return "0m"
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}
