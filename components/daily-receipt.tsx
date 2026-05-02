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

export function DailyReceipt({ entries }: DailyReceiptProps) {
  const today = new Date()
  const formattedDate = format(today, "EEEE, MMMM d, yyyy").toLowerCase()

  // entries are passed newest-first; render oldest-first for receipt feel
  const ordered = [...entries].reverse()

  const earliest = ordered.length > 0 ? format(new Date(ordered[0].created_at), "h:mm a") : null
  const latest =
    ordered.length > 0
      ? format(new Date(ordered[ordered.length - 1].created_at), "h:mm a")
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
      className="mx-auto max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm"
      aria-label="today's receipt"
    >
      {/* Header */}
      <header className="border-b border-dashed border-border pb-4 text-center">
        <h2 className="font-serif text-2xl text-foreground">today, on the record</h2>
        <p className="mt-1 text-sm text-muted-foreground">{formattedDate}</p>
      </header>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-2 border-b border-dashed border-border py-4 text-center">
        <div>
          <p className="font-serif text-2xl text-foreground">{ordered.length}</p>
          <p className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">
            things logged
          </p>
        </div>
        <div>
          <p className="font-serif text-2xl text-foreground">
            {totalMinutes > 0 ? formatDuration(totalMinutes) : "—"}
          </p>
          <p className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">
            tracked
          </p>
        </div>
        <div>
          <p className="font-serif text-2xl text-foreground">{projects.length}</p>
          <p className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">
            projects
          </p>
        </div>
      </div>

      {/* Project pills */}
      {projects.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1.5 border-b border-dashed border-border py-4">
          {projects.map((p) => (
            <span
              key={p}
              className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground"
            >
              {p}
            </span>
          ))}
        </div>
      )}

      {/* Items */}
      <ul className="space-y-2 py-4">
        {ordered.map((entry) => {
          const t = format(new Date(entry.created_at), "h:mm a")
          return (
            <li key={entry.id} className="flex items-start gap-3 text-sm">
              <span className="w-14 flex-shrink-0 font-mono text-[0.7rem] text-muted-foreground">
                {t}
              </span>
              <span className="flex-1 leading-relaxed text-foreground">
                {entry.content}
                {entry.project && (
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    · {entry.project}
                  </span>
                )}
                {typeof entry.duration_minutes === "number" && (
                  <span className="ml-1 text-xs text-muted-foreground">
                    · ~{formatDuration(entry.duration_minutes)}
                  </span>
                )}
              </span>
            </li>
          )
        })}
      </ul>

      {/* Footer */}
      <footer className="border-t border-dashed border-border pt-4 text-center">
        {earliest && latest && (
          <p className="text-xs text-muted-foreground">
            {earliest} → {latest}
          </p>
        )}
        <p className="mt-2 font-serif text-sm italic text-muted-foreground">
          this is your day. it counts.
        </p>
        <p className="mt-1 text-[0.7rem] uppercase tracking-wide text-muted-foreground">
          — alibi
        </p>
      </footer>
    </article>
  )
}
