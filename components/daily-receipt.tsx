"use client"

import { format } from "date-fns"
import type { Entry } from "@/lib/types"

interface DailyReceiptProps {
  entries: Entry[]
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const rem = minutes % 60
  if (rem === 0) return `${hours}h`
  return `${hours}h ${rem}m`
}

function DottedDivider() {
  return (
    <div className="my-3 border-b border-dotted border-muted-foreground/30" />
  )
}

export function DailyReceipt({ entries }: DailyReceiptProps) {
  const today = new Date()
  const formattedDate = format(today, "MMM d, yyyy").toUpperCase()
  const dayName = format(today, "EEEE").toUpperCase()

  // entries are passed newest-first; render oldest-first for receipt feel
  const ordered = [...entries].reverse()

  const earliest = ordered.length > 0 ? format(new Date(ordered[0].created_at), "HH:mm") : null
  const latest =
    ordered.length > 0
      ? format(new Date(ordered[ordered.length - 1].created_at), "HH:mm")
      : null

  // Aggregate projects + total tracked time
  const projectSet = new Set<string>()
  let totalMinutes = 0
  ordered.forEach((e) => {
    if (e.project) projectSet.add(e.project)
    if (typeof e.duration_minutes === "number") totalMinutes += e.duration_minutes
  })
  const projects = Array.from(projectSet)

  return (
    <article
      className="alibi-soft-rise mx-auto max-w-sm rounded-lg border border-border bg-[hsl(40_30%_97%)] px-5 py-6 font-mono shadow-md"
      aria-label="today's receipt"
      style={{
        backgroundImage: `repeating-linear-gradient(
          0deg,
          transparent,
          transparent 1.4rem,
          hsl(40 20% 92% / 0.5) 1.4rem,
          hsl(40 20% 92% / 0.5) 1.45rem
        )`,
      }}
    >
      {/* Header */}
      <header className="text-center">
        <p className="text-[0.65rem] tracking-[0.2em] text-muted-foreground">
          — ALIBI —
        </p>
        <h2 className="mt-1 text-lg font-bold tracking-wide text-foreground">
          {dayName}
        </h2>
        <p className="text-xs tracking-wider text-muted-foreground">{formattedDate}</p>
      </header>

      <DottedDivider />

      {/* Summary row */}
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">ITEMS</span>
        <span className="text-foreground">{ordered.length}</span>
      </div>
      <div className="mt-1 flex justify-between text-xs">
        <span className="text-muted-foreground">TIME LOGGED</span>
        <span className="text-foreground">
          {totalMinutes > 0 ? formatDuration(totalMinutes) : "—"}
        </span>
      </div>
      <div className="mt-1 flex justify-between text-xs">
        <span className="text-muted-foreground">PROJECTS</span>
        <span className="text-foreground">{projects.length}</span>
      </div>

      <DottedDivider />

      {/* Project pills */}
      {projects.length > 0 && (
        <>
          <div className="flex flex-wrap justify-center gap-1.5">
            {projects.map((p) => (
              <span
                key={p}
                className="rounded bg-primary/15 px-2 py-0.5 text-[0.65rem] uppercase tracking-wide text-primary"
              >
                {p}
              </span>
            ))}
          </div>
          <DottedDivider />
        </>
      )}

      {/* Items */}
      <ul className="space-y-2">
        {ordered.map((entry) => {
          const t = format(new Date(entry.created_at), "HH:mm")
          return (
            <li key={entry.id} className="flex items-start gap-2 text-xs">
              <span className="w-10 flex-shrink-0 text-muted-foreground">{t}</span>
              <span className="flex-1 leading-relaxed text-foreground">
                {entry.content}
                {typeof entry.duration_minutes === "number" && (
                  <span className="ml-1 text-muted-foreground">
                    ({formatDuration(entry.duration_minutes)})
                  </span>
                )}
              </span>
            </li>
          )
        })}
      </ul>

      <DottedDivider />

      {/* Footer */}
      <footer className="text-center">
        {earliest && latest && (
          <p className="text-[0.65rem] text-muted-foreground">
            {earliest} - {latest}
          </p>
        )}
        <p className="mt-3 font-sans text-sm italic text-muted-foreground">
          this is your day. it counts.
        </p>
        <p className="mt-2 text-[0.6rem] tracking-[0.15em] text-muted-foreground/70">
          THANK YOU FOR SHOWING UP
        </p>
      </footer>
    </article>
  )
}
