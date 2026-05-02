"use client"

import type { Entry } from "@/lib/types"
import {
  aggregateMarkers,
  aggregateEffort,
  aggregateSatisfaction,
} from "@/lib/dashboard-data"
import { GLASS_PANEL_STYLE } from "@/lib/ui-styles"

interface AdhdMarkersProps {
  entries: Entry[]
}

const MARKER_COLORS: Record<string, string> = {
  avoidance: "#7A9A8A", // sage green — positive
  hyperfocus: "#8B7355", // warm brown — neutral
  guilt: "#C4704B", // terracotta — watch
  novelty: "#6B8E7A", // lighter sage — curious
}

const EFFORT_COLORS: Record<string, string> = {
  easy: "#A8C4A2",
  medium: "#8B9E85",
  hard: "#7A9A8A",
  grind: "#5A7A6A",
}

const SATISFACTION_COLORS: Record<string, string> = {
  satisfied: "#7A9A8A",
  mixed: "#A89680",
  frustrated: "#C4704B",
  unclear: "#B8A898",
}

export function AdhdMarkers({ entries }: AdhdMarkersProps) {
  const markers = aggregateMarkers(entries)
  const effort = aggregateEffort(entries)
  const satisfaction = aggregateSatisfaction(entries)

  const hasAnyMarkers = markers.some((m) => m.count > 0)
  const hasEffortData = effort.some((e) => e.count > 0)
  const hasSatisfactionData = satisfaction.some((s) => s.count > 0)

  return (
    <section className="space-y-4" style={GLASS_PANEL_STYLE}>
      <div className="px-5 pt-5">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#6B5A47]">
          adhd patterns
        </h2>
        <p className="mt-0.5 text-[11px] text-[#A89680]">
          what your entries say about how you work
        </p>
      </div>

      {/* Markers Grid */}
      <div className="grid grid-cols-2 gap-3 px-5">
        {markers.map((m) => (
          <div
            key={m.key}
            className="rounded-lg p-3"
            style={{
              background: "rgba(255, 250, 240, 0.4)",
              border: "1px solid rgba(60, 40, 20, 0.06)",
            }}
          >
            <div className="flex items-baseline justify-between">
              <span
                className="font-mono text-[1.4rem] font-semibold leading-none tabular-nums"
                style={{ color: MARKER_COLORS[m.key] }}
              >
                {m.count}
              </span>
              {m.pct > 0 && (
                <span className="text-[10px] text-[#A89680]">{m.pct}%</span>
              )}
            </div>
            <p className="mt-1 text-[11px] font-medium text-[#6B5A47]">
              {m.label}
            </p>
            <p className="mt-0.5 text-[9px] text-[#A89680]">{m.description}</p>
          </div>
        ))}
      </div>

      {/* Effort Distribution */}
      {hasEffortData && (
        <div className="px-5 pb-2">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.12em] text-[#A89680]">
            effort level
          </p>
          <div className="flex h-3 overflow-hidden rounded-full bg-[rgba(60,40,20,0.04)]">
            {effort
              .filter((e) => e.count > 0)
              .map((e) => (
                <div
                  key={e.level}
                  className="transition-all"
                  style={{
                    width: `${e.pct}%`,
                    backgroundColor: EFFORT_COLORS[e.level],
                  }}
                  title={`${e.level}: ${e.count} (${e.pct}%)`}
                />
              ))}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
            {effort
              .filter((e) => e.count > 0)
              .map((e) => (
                <span key={e.level} className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: EFFORT_COLORS[e.level] }}
                  />
                  <span className="text-[9px] text-[#6B5A47]">
                    {e.level} ({e.count})
                  </span>
                </span>
              ))}
          </div>
        </div>
      )}

      {/* Satisfaction Distribution */}
      {hasSatisfactionData && (
        <div className="px-5 pb-5">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.12em] text-[#A89680]">
            satisfaction
          </p>
          <div className="flex h-3 overflow-hidden rounded-full bg-[rgba(60,40,20,0.04)]">
            {satisfaction
              .filter((s) => s.count > 0)
              .map((s) => (
                <div
                  key={s.level}
                  className="transition-all"
                  style={{
                    width: `${s.pct}%`,
                    backgroundColor: SATISFACTION_COLORS[s.level],
                  }}
                  title={`${s.level}: ${s.count} (${s.pct}%)`}
                />
              ))}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
            {satisfaction
              .filter((s) => s.count > 0)
              .map((s) => (
                <span key={s.level} className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: SATISFACTION_COLORS[s.level] }}
                  />
                  <span className="text-[9px] text-[#6B5A47]">
                    {s.level} ({s.count})
                  </span>
                </span>
              ))}
          </div>
        </div>
      )}

      {!hasAnyMarkers && !hasEffortData && !hasSatisfactionData && (
        <p className="px-5 pb-5 text-[11px] text-[#A89680]">
          no patterns detected yet. keep logging and i&apos;ll start noticing.
        </p>
      )}
    </section>
  )
}
