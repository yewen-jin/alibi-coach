"use client"

import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { Entry } from "@/lib/types"
import {
  bucketByDay,
  buildCalendarGrid,
  type DayBucket,
} from "@/lib/dashboard-data"
import { cn } from "@/lib/utils"

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
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-serif text-lg text-foreground">
          {MONTHS[month]} {year}
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={goPrev}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={goNext}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="pb-2 text-center text-xs uppercase tracking-wide text-muted-foreground"
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
          return (
            <button
              key={cell.dateKey}
              onClick={() =>
                setSelectedKey(isSelected ? null : cell.dateKey)
              }
              className={cn(
                "relative aspect-square rounded-lg border text-sm transition-all",
                isSelected
                  ? "border-primary bg-primary/10 ring-2 ring-primary/40"
                  : cell.isToday
                    ? "border-primary/50 bg-card"
                    : "border-border bg-card hover:border-primary/30",
                !cell.bucket && "text-muted-foreground"
              )}
              style={
                cell.bucket && !isSelected
                  ? {
                      backgroundColor: `color-mix(in oklab, hsl(var(--primary)) ${
                        Math.round(intensity * 60)
                      }%, hsl(var(--card)))`,
                    }
                  : undefined
              }
              aria-label={`${cell.dateKey}: ${cell.bucket?.count ?? 0} entries`}
            >
              <span className="absolute left-1.5 top-1 text-xs font-medium">
                {cell.day}
              </span>
              {cell.bucket && (
                <span className="absolute bottom-1 right-1.5 text-[10px] tabular-nums text-foreground/70">
                  {cell.bucket.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {selected && (
        <div className="alibi-soft-rise mt-5 rounded-xl border border-border bg-background p-4">
          <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
            {selected.date} · {selected.count} entries
            {selected.totalMinutes > 0 &&
              ` · ${formatMinutes(selected.totalMinutes)}`}
          </p>
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
                  className="flex items-start gap-3 text-sm leading-relaxed text-foreground"
                >
                  <span className="mt-0.5 font-mono text-xs text-muted-foreground">
                    {new Date(entry.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="flex-1">{entry.content}</span>
                  {entry.project && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {entry.project}
                    </span>
                  )}
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function formatMinutes(min: number): string {
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}
