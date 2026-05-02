"use client"

import { formatDistanceToNow, isToday, isYesterday, format } from "date-fns"
import { Check, Trash2 } from "lucide-react"
import type { Entry } from "@/lib/types"
import { cn } from "@/lib/utils"

interface EntryListProps {
  entries: Entry[]
  onDelete?: (id: string) => void
}

function groupEntriesByDate(entries: Entry[]) {
  const groups: { [key: string]: Entry[] } = {}
  
  entries.forEach((entry) => {
    const date = new Date(entry.created_at)
    let key: string
    
    if (isToday(date)) {
      key = "Today"
    } else if (isYesterday(date)) {
      key = "Yesterday"
    } else {
      key = format(date, "EEEE, MMMM d")
    }
    
    if (!groups[key]) {
      groups[key] = []
    }
    groups[key].push(entry)
  })
  
  return groups
}

export function EntryList({ entries, onDelete }: EntryListProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
          <Check className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-serif text-xl text-foreground mb-2">Your done list awaits</h3>
        <p className="text-muted-foreground max-w-sm mx-auto">
          Start logging what you&apos;ve accomplished. No task is too small.
        </p>
      </div>
    )
  }

  const groupedEntries = groupEntriesByDate(entries)

  return (
    <div className="space-y-6">
      {Object.entries(groupedEntries).map(([dateLabel, dateEntries]) => (
        <div key={dateLabel}>
          <h3 className="text-sm font-medium text-muted-foreground mb-3 px-1">
            {dateLabel} <span className="text-xs">({dateEntries.length} done)</span>
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

function EntryItem({ entry, onDelete }: { entry: Entry; onDelete?: (id: string) => void }) {
  const timeAgo = formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })

  return (
    <li className="group relative bg-card rounded-lg border border-border p-4 transition-all hover:shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center mt-0.5">
          <Check className="w-3.5 h-3.5 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-foreground leading-relaxed">{entry.content}</p>
          <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>
        </div>
        {onDelete && (
          <button
            onClick={() => onDelete(entry.id)}
            className={cn(
              "opacity-0 group-hover:opacity-100 transition-opacity",
              "p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            )}
            aria-label="Delete entry"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </li>
  )
}
