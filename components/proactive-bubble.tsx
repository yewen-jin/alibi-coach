"use client"

import { X } from "lucide-react"
import type { ProactiveMessage } from "@/lib/types"

interface ProactiveBubbleProps {
  message: ProactiveMessage
  onDismiss?: (id: string) => void
}

const KIND_LABEL: Record<ProactiveMessage["kind"], string> = {
  insight: "alibi noticed",
  pattern: "a pattern",
  nudge: "a quiet nudge",
  celebration: "for the record",
}

export function ProactiveBubble({ message, onDismiss }: ProactiveBubbleProps) {
  return (
    <div
      className="alibi-soft-rise rounded-2xl border border-coach-border bg-coach-bg/70 p-4"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            {KIND_LABEL[message.kind]}
          </p>
          <p className="font-serif text-[1rem] leading-relaxed text-coach-text">
            {message.content}
          </p>
        </div>
        {onDismiss && (
          <button
            onClick={() => onDismiss(message.id)}
            className="-mr-1 -mt-1 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
