"use client"

import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns"
import { Trash2 } from "lucide-react"
import type { Entry } from "@/lib/types"
import { cn } from "@/lib/utils"

interface EntryListProps {
  entries: Entry[]
  onDelete?: (id: string) => void
}

function groupEntriesByDate(entries: Entry[]) {
  const groups: { label: string; entries: Entry[] }[] = []
  const map = new Map<string, Entry[]>()

  entries.forEach((entry) => {
    const date = new Date(entry.created_at)
    let key: string
    if (isToday(date)) key = "today"
    else if (isYesterday(date)) key = "yesterday"
    else key = format(date, "EEEE, MMMM d").toLowerCase()

    if (!map.has(key)) {
      map.set(key, [])
      groups.push({ label: key, entries: map.get(key)! })
    }
    map.get(key)!.push(entry)
  })

  return groups
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const rem = minutes % 60
  if (rem === 0) return `${hours}h`
  return `${hours}h ${rem}m`
}

export function EntryList({ entries, onDelete }: EntryListProps) {
  if (entries.length === 0) {
    return (
      <div className="px-4 py-12 text-center">
        <p className="font-serif text-lg text-foreground">nothing on the record yet.</p>
        <p className="mt-2 text-sm text-muted-foreground">
          tell me one thing you did today. the smallest counts.
        </p>
      </div>
    )
  }

  const groups = groupEntriesByDate(entries)

  return (
    <div className="space-y-6">
      {groups.map(({ label, entries: dateEntries }) => (
        <div key={label}>
          <h3 className="mb-3 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
            <span className="ml-2 normal-case text-muted-foreground/70">
              · {dateEntries.length}
            </span>
          </h3>
          <ul className="space-y-2">
            {dateEntries.map((entry) => (
              <EntryItem key={entry.id} entry={entry} onDelete={onDelete} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

function EntryItem({
  entry,
  onDelete,
}: {
  entry: Entry
  onDelete?: (id: string) => void
}) {
  const timeAgo = formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })

  return (
    <li className="group relative rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-sm">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="mt-2 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent"
        />
        <div className="min-w-0 flex-1">
          <p className="leading-relaxed text-foreground">{entry.content}</p>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{timeAgo}</span>
            {entry.project && (
              <span className="rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground">
                {entry.project}
              </span>
            )}
            {entry.duration_minutes !== null && entry.duration_minutes !== undefined && (
              <span>~{formatDuration(entry.duration_minutes)}</span>
            )}
            {entry.mood && <span className="italic">— {entry.mood}</span>}
          </div>
        </div>

        {onDelete && (
          <button
            onClick={() => onDelete(entry.id)}
            className={cn(
              "rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
            )}
            aria-label="Delete entry"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </li>
  )
}
