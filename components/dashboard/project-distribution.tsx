"use client"

import { useMemo } from "react"
import type { Entry } from "@/lib/types"
import { aggregateByProject } from "@/lib/dashboard-data"

interface ProjectDistributionProps {
  entries: Entry[]
}

// Warm, distinct hues drawn from the existing palette
const COLORS = [
  "var(--color-primary)",
  "var(--color-coach-text)",
  "color-mix(in oklab, var(--color-primary) 60%, white)",
  "color-mix(in oklab, var(--color-coach-text) 60%, white)",
  "color-mix(in oklab, var(--color-primary) 30%, var(--color-foreground))",
]

export function ProjectDistribution({ entries }: ProjectDistributionProps) {
  const projects = useMemo(() => aggregateByProject(entries), [entries])
  const total = projects.reduce((sum, p) => sum + p.count, 0)

  if (projects.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-2 font-serif text-lg text-foreground">where you spent time</h2>
        <p className="text-sm text-muted-foreground">
          nothing logged yet. drop something in.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="mb-4 font-serif text-lg text-foreground">
        where you spent time
      </h2>

      <div className="mb-4 flex h-3 w-full overflow-hidden rounded-full bg-muted">
        {projects.map((p, i) => {
          const pct = (p.count / total) * 100
          if (pct < 1) return null
          return (
            <div
              key={p.project}
              style={{
                width: `${pct}%`,
                backgroundColor: COLORS[i % COLORS.length],
              }}
              title={`${p.project}: ${p.count} entries`}
            />
          )
        })}
      </div>

      <ul className="space-y-2">
        {projects.slice(0, 8).map((p, i) => {
          const pct = (p.count / total) * 100
          return (
            <li key={p.project} className="flex items-center gap-3 text-sm">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
                aria-hidden="true"
              />
              <span className="flex-1 capitalize text-foreground">
                {p.project}
              </span>
              <span className="tabular-nums text-muted-foreground">
                {p.count}
              </span>
              <span className="w-12 text-right tabular-nums text-muted-foreground">
                {pct.toFixed(0)}%
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
