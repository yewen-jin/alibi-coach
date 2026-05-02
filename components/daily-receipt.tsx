"use client"

import { format } from "date-fns"
import { Check, Star } from "lucide-react"
import type { Entry } from "@/lib/types"

interface DailyReceiptProps {
  entries: Entry[]
}

export function DailyReceipt({ entries }: DailyReceiptProps) {
  const today = new Date()
  const formattedDate = format(today, "EEEE, MMMM d, yyyy")
  const formattedTime = format(today, "h:mm a")

  // Calculate some stats
  const totalItems = entries.length
  const earliestEntry = entries.length > 0 
    ? format(new Date(entries[entries.length - 1].created_at), "h:mm a")
    : null
  const latestEntry = entries.length > 0
    ? format(new Date(entries[0].created_at), "h:mm a")
    : null

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm max-w-md mx-auto">
      {/* Receipt Header */}
      <div className="text-center border-b border-dashed border-border pb-4 mb-4">
        <h2 className="font-serif text-2xl text-foreground mb-1">Daily Receipt</h2>
        <p className="text-sm text-muted-foreground">{formattedDate}</p>
        <p className="text-xs text-muted-foreground mt-1">Generated at {formattedTime}</p>
      </div>

      {/* Stats */}
      <div className="flex justify-center gap-8 border-b border-dashed border-border pb-4 mb-4">
        <div className="text-center">
          <p className="text-3xl font-bold text-primary">{totalItems}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Things Done</p>
        </div>
        {earliestEntry && latestEntry && earliestEntry !== latestEntry && (
          <div className="text-center">
            <p className="text-sm text-foreground font-medium">{earliestEntry}</p>
            <p className="text-xs text-muted-foreground">to</p>
            <p className="text-sm text-foreground font-medium">{latestEntry}</p>
          </div>
        )}
      </div>

      {/* Items List */}
      <div className="space-y-2 mb-4">
        {entries.map((entry, index) => (
          <div key={entry.id} className="flex items-start gap-2 text-sm">
            <span className="text-muted-foreground font-mono text-xs mt-0.5">
              {String(index + 1).padStart(2, "0")}
            </span>
            <Check className="w-3.5 h-3.5 text-accent mt-0.5 flex-shrink-0" />
            <span className="text-foreground">{entry.content}</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="text-center border-t border-dashed border-border pt-4">
        <div className="flex items-center justify-center gap-1 text-accent mb-2">
          <Star className="w-4 h-4 fill-current" />
          <Star className="w-4 h-4 fill-current" />
          <Star className="w-4 h-4 fill-current" />
        </div>
        <p className="text-sm text-muted-foreground italic">
          &quot;You accomplished more than you think.&quot;
        </p>
        <p className="text-xs text-muted-foreground mt-2">— Alibi</p>
      </div>

      {/* Receipt edge effect */}
      <div className="mt-4 -mx-6 -mb-6 h-4 bg-gradient-to-b from-card to-transparent relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-4 border-t border-dashed border-border" />
      </div>
    </div>
  )
}
