"use client"

import { useMemo } from "react"
import type { Entry } from "@/lib/types"
import { aggregateByProject } from "@/lib/dashboard-data"
import { GLASS_PANEL_STYLE } from "@/lib/ui-styles"

interface ProjectDistributionProps {
  entries: Entry[]
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

export function ProjectDistribution({ entries }: ProjectDistributionProps) {
  const projects = useMemo(() => aggregateByProject(entries), [entries])
  const total = projects.reduce((sum, p) => sum + p.count, 0)

  if (projects.length === 0) {
    return (
      <section className="p-5" style={GLASS_PANEL_STYLE}>
        <h2 className="mb-2 text-[16px] font-semibold tracking-tight text-[#2A1F14]">
          where you spent time
        </h2>
        <p className="text-[13px] text-[#6B5A47]">
          nothing logged yet. drop something in.
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
          by project
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
        {projects.map((p, i) => {
          const pct = (p.count / total) * 100
          if (pct < 1) return null
          return (
            <div
              key={p.project}
              style={{
                width: `${pct}%`,
                background: PROJECT_COLORS[i % PROJECT_COLORS.length],
              }}
              title={`${p.project}: ${p.count} entries`}
            />
          )
        })}
      </div>

      {/* Legend / list */}
      <ul className="space-y-2">
        {projects.slice(0, 8).map((p, i) => {
          const pct = (p.count / total) * 100
          return (
            <li
              key={p.project}
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
                {p.project}
              </span>
              <span className="font-mono tabular-nums text-[#6B5A47]">
                {p.count}
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
