"use client"

import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { Entry } from "@/lib/types"
import {
  bucketByDay,
  buildCalendarGrid,
  type DayBucket,
} from "@/lib/dashboard-data"
import { GLASS_PANEL_STYLE, PAPER_INSET_STYLE } from "@/lib/ui-styles"

interface CalendarViewProps {
  entries: Entry[]
}

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
]

const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]

export function CalendarView({ entries }: CalendarViewProps) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  const buckets = useMemo(() => bucketByDay(entries), [entries])
  const cells = useMemo(
    () => buildCalendarGrid(year, month, buckets),
    [year, month, buckets]
  )

  const maxCount = useMemo(() => {
    let max = 0
    cells.forEach((c) => {
      if (c.bucket && c.bucket.count > max) max = c.bucket.count
    })
    return max
  }, [cells])

  const selected: DayBucket | null = selectedKey
    ? buckets.get(selectedKey) ?? null
    : null

  const goPrev = () => {
    if (month === 0) {
      setMonth(11)
      setYear(year - 1)
    } else {
      setMonth(month - 1)
    }
    setSelectedKey(null)
  }
  const goNext = () => {
    if (month === 11) {
      setMonth(0)
      setYear(year + 1)
    } else {
      setMonth(month + 1)
    }
    setSelectedKey(null)
  }

  return (
    <section className="p-5" style={GLASS_PANEL_STYLE}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-baseline gap-3">
          <h2 className="text-[16px] font-semibold tracking-tight text-[#2A1F14]">
            {MONTHS[month]} {year}
          </h2>
          <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#A89680]">
            calendar
          </span>
        </div>
        <div className="flex items-center gap-1">
          <NavBtn onClick={goPrev} ariaLabel="previous month">
            <ChevronLeft className="h-4 w-4" />
          </NavBtn>
          <NavBtn onClick={goNext} ariaLabel="next month">
            <ChevronRight className="h-4 w-4" />
          </NavBtn>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="pb-2 text-center text-[10px] font-medium uppercase tracking-[0.16em] text-[#A89680]"
          >
            {d}
          </div>
        ))}
        {cells.map((cell, i) => {
          if (cell.dateKey === null) {
            return <div key={`blank-${i}`} aria-hidden="true" />
          }
          const intensity =
            cell.bucket && maxCount > 0 ? cell.bucket.count / maxCount : 0
          const isSelected = selectedKey === cell.dateKey
          const alpha = cell.bucket ? 0.12 + intensity * 0.48 : 0
          const bg = cell.bucket
            ? `rgba(200, 85, 61, ${alpha.toFixed(3)})`
            : "rgba(255, 250, 240, 0.4)"

          let borderColor = "rgba(60, 40, 20, 0.08)"
          if (isSelected) borderColor = "#C8553D"
          else if (cell.isToday) borderColor = "#8B9D7F"

          return (
            <button
              key={cell.dateKey}
              onClick={() =>
                setSelectedKey(isSelected ? null : cell.dateKey)
              }
              aria-label={`${cell.dateKey}: ${cell.bucket?.count ?? 0} entries${
                cell.isToday ? ", today" : ""
              }`}
              aria-pressed={isSelected}
              className="relative aspect-square rounded-lg text-[12px] transition-all hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8553D]/40"
              style={{
                background: bg,
                border: `1px solid ${borderColor}`,
                boxShadow: isSelected
                  ? "0 0 0 3px rgba(200, 85, 61, 0.18)"
                  : "none",
                color: cell.bucket ? "#2A1F14" : "#A89680",
              }}
            >
              <span className="absolute left-1.5 top-1 font-medium tabular-nums">
                {cell.day}
              </span>
              {cell.bucket && (
                <span className="absolute bottom-1 right-1.5 font-mono text-[9px] tabular-nums opacity-70">
                  {cell.bucket.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-end gap-3 text-[10px] font-medium uppercase tracking-[0.14em] text-[#A89680]">
        <span className="flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-sm"
            style={{ background: "rgba(200, 85, 61, 0.18)" }}
            aria-hidden
          />
          quiet
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-sm"
            style={{ background: "rgba(200, 85, 61, 0.55)" }}
            aria-hidden
          />
          busy
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-sm border border-[#8B9D7F]"
            style={{ background: "transparent" }}
            aria-hidden
          />
          today
        </span>
      </div>

      {selected && (
        <div className="alibi-soft-rise mt-5 px-5 py-4" style={PAPER_INSET_STYLE}>
          <div className="mb-3 flex items-baseline gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#2A1F14]">
              {selected.date}
            </span>
            <hr
              className="flex-1 border-0"
              style={{ borderTop: "1px dashed #C8B89F" }}
            />
            <span className="font-mono text-[10px] tracking-[0.12em] text-[#A89680]">
              {String(selected.count).padStart(2, "0")} ITEMS
              {selected.totalMinutes > 0 &&
                ` · ${formatMinutes(selected.totalMinutes)}`}
            </span>
          </div>
          <ul className="space-y-2">
            {selected.entries
              .slice()
              .sort(
                (a, b) =>
                  new Date(a.created_at).getTime() -
                  new Date(b.created_at).getTime()
              )
              .map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-start gap-3 text-[13.5px] leading-[1.5] text-[#2A1F14]"
                >
                  <span className="mt-0.5 font-mono text-[11px] tracking-[0.04em] text-[#A89680]">
                    {new Date(entry.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="flex-1">{entry.content}</span>
                  {entry.project && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] tracking-wide text-[#6B5A47]"
                      style={{ background: "rgba(60, 40, 20, 0.06)" }}
                    >
                      {entry.project}
                    </span>
                  )}
                </li>
              ))}
          </ul>
        </div>
      )}
    </section>
  )
}

function NavBtn({
  children,
  onClick,
  ariaLabel,
}: {
  children: React.ReactNode
  onClick: () => void
  ariaLabel: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="flex h-7 w-7 items-center justify-center rounded-full text-[#6B5A47] transition-colors hover:bg-white/50 hover:text-[#2A1F14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8553D]/40"
    >
      {children}
    </button>
  )
}

function formatMinutes(min: number): string {
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}
