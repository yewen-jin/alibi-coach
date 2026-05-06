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
      className="alibi-soft-rise alibi-card p-4"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-[10px] uppercase tracking-wide text-alibi-teal">
            {KIND_LABEL[message.kind]}
          </p>
          <p className="font-serif text-[1rem] leading-relaxed text-alibi-ink">
            {message.content}
          </p>
        </div>
        {onDismiss && (
          <button
            onClick={() => onDismiss(message.id)}
            className="-mr-1 -mt-1 rounded-full p-1 text-alibi-teal/60 transition-colors hover:text-alibi-blue"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
