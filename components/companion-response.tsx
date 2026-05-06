"use client"

import { X } from "lucide-react"

interface CompanionResponseProps {
  message: string
  onDismiss?: () => void
}

export function CompanionResponse({
  message,
  onDismiss,
}: CompanionResponseProps) {
  return (
    <div
      className="alibi-soft-rise alibi-card p-5"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="whitespace-pre-wrap font-serif text-[1.05rem] leading-relaxed text-alibi-ink">
            {message}
          </p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="-mr-1 -mt-1 rounded-full p-1 text-alibi-teal/70 transition-colors hover:text-alibi-blue"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
