"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface CoachResponseProps {
  message: string
  onDismiss?: () => void
}

export function CoachResponse({ message, onDismiss }: CoachResponseProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 30)
    return () => clearTimeout(timer)
  }, [])

  const handleDismiss = () => {
    setIsVisible(false)
    setTimeout(() => onDismiss?.(), 200)
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-coach-border bg-coach-bg p-5 transition-all duration-200",
        isVisible ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="whitespace-pre-wrap font-serif text-[1.05rem] leading-relaxed text-coach-text">
            {message}
          </p>
        </div>
        {onDismiss && (
          <button
            onClick={handleDismiss}
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
