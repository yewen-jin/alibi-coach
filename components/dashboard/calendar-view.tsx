"use client"

import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { TimeBlock } from "@/lib/types"
import {
  bucketByDay,
  buildCalendarGrid,
  type DayBucket,
} from "@/lib/dashboard-data"

interface CalendarViewProps {
  blocks: TimeBlock[]
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

export function CalendarView({ blocks }: CalendarViewProps) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  const buckets = useMemo(() => bucketByDay(blocks), [blocks])
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
    <section className="alibi-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-baseline gap-3">
          <h2 className="text-[16px] font-black tracking-tight text-alibi-blue">
            {MONTHS[month]} {year}
          </h2>
          <span className="rounded-full bg-alibi-lavender/20 px-2 py-1 text-xs font-black uppercase tracking-[0.12em] text-alibi-teal">
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
            className="pb-2 text-center text-xs font-black uppercase tracking-[0.1em] text-alibi-teal"
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
          const alpha = cell.bucket ? 0.14 + intensity * 0.48 : 0
          const bg = cell.bucket
            ? `rgba(191, 125, 173, ${alpha.toFixed(3)})`
            : "rgba(147, 165, 228, 0.12)"

          let borderColor = "rgba(50, 83, 199, 0.14)"
          if (isSelected) borderColor = "#3253C7"
          else if (cell.isToday) borderColor = "#43849D"

          return (
            <button
              key={cell.dateKey}
              onClick={() =>
                setSelectedKey(isSelected ? null : cell.dateKey)
              }
              aria-label={`${cell.dateKey}: ${cell.bucket?.count ?? 0} blocks${
                cell.isToday ? ", today" : ""
              }`}
              aria-pressed={isSelected}
              className="relative aspect-square rounded-2xl text-sm font-black transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-alibi-pink/25"
              style={{
                background: bg,
                border: `1px solid ${borderColor}`,
                boxShadow: isSelected
                  ? "0 0 0 4px rgba(50, 83, 199, 0.18)"
                  : "none",
                color: cell.bucket ? "#162044" : "#43849D",
              }}
            >
              <span className="absolute left-1.5 top-1 font-medium tabular-nums">
                {cell.day}
              </span>
              {cell.bucket && (
                <span className="absolute bottom-1 right-1.5 font-mono text-xs tabular-nums opacity-70">
                  {cell.bucket.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-end gap-3 text-xs font-black uppercase tracking-[0.1em] text-alibi-teal">
        <span className="flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-sm"
            style={{ background: "rgba(191, 125, 173, 0.22)" }}
            aria-hidden
          />
          quiet
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-sm"
            style={{ background: "rgba(191, 125, 173, 0.62)" }}
            aria-hidden
          />
          busy
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-sm border border-alibi-teal"
            style={{ background: "transparent" }}
            aria-hidden
          />
          today
        </span>
      </div>

      {selected && (
        <div className="alibi-soft-rise mt-5 rounded-3xl border border-alibi-lavender/30 bg-white/80 px-5 py-4 shadow-inner">
          <div className="mb-3 flex items-baseline gap-3">
            <span className="text-xs font-black uppercase tracking-[0.12em] text-alibi-blue">
              {selected.date}
            </span>
            <hr
              className="flex-1 border-0"
              style={{ borderTop: "1px dashed rgba(147,165,228,0.7)" }}
            />
            <span className="font-mono text-xs font-black tracking-[0.08em] text-alibi-teal">
              {String(selected.count).padStart(2, "0")} BLOCKS
              {selected.totalMinutes > 0 &&
                ` · ${formatMinutes(selected.totalMinutes)}`}
            </span>
          </div>
          <ul className="space-y-2">
            {selected.blocks
              .slice()
              .sort(
                (a, b) =>
                  new Date(a.started_at).getTime() -
                  new Date(b.started_at).getTime()
              )
              .map((block) => (
                <li
                  key={block.id}
                  className="flex items-start gap-3 text-base font-semibold leading-relaxed text-alibi-ink"
                >
                  <span className="mt-0.5 font-mono text-xs font-bold tracking-[0.04em] text-alibi-teal">
                    {new Date(block.started_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="flex-1">{block.task_name || "unnamed time block"}</span>
                  {block.category && (
                    <span
                      className="rounded-full bg-alibi-lavender/20 px-2 py-0.5 text-xs font-bold tracking-wide text-alibi-blue"
                    >
                      {block.category.replace("_", " ")}
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
      className="flex h-7 w-7 items-center justify-center rounded-full text-alibi-teal transition hover:-translate-y-0.5 hover:bg-alibi-lavender/20 hover:text-alibi-blue focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-alibi-pink/20"
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
