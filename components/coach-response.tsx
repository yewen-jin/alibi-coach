"use client"

import { X } from "lucide-react"

interface CoachResponseProps {
  message: string
  onDismiss?: () => void
}

export function CoachResponse({ message, onDismiss }: CoachResponseProps) {
  return (
    <div
      className="alibi-soft-rise rounded-2xl border border-coach-border bg-coach-bg p-5"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="whitespace-pre-wrap font-serif text-[1.05rem] leading-relaxed text-coach-text">
            {message}
          </p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
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
