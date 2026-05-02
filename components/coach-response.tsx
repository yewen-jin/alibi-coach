"use client"

import { useState, useEffect } from "react"
import { Heart, Sparkles, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface CoachResponseProps {
  message: string
  type?: "encouragement" | "reframe" | "celebration"
  onDismiss?: () => void
}

export function CoachResponse({ message, type = "encouragement", onDismiss }: CoachResponseProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Animate in
    const timer = setTimeout(() => setIsVisible(true), 50)
    return () => clearTimeout(timer)
  }, [])

  const handleDismiss = () => {
    setIsVisible(false)
    setTimeout(() => onDismiss?.(), 200)
  }

  const Icon = type === "celebration" ? Sparkles : Heart

  return (
    <div
      className={cn(
        "bg-coach-bg border border-coach-border rounded-xl p-4 transition-all duration-200",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
          <Icon className="w-4 h-4 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-coach-text leading-relaxed">{message}</p>
        </div>
        {onDismiss && (
          <button
            onClick={handleDismiss}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}

// Pre-written coach responses for different situations
export const coachResponses = {
  newEntry: [
    "Look at you go! That's another thing done.",
    "You did it! Every accomplishment matters.",
    "Nice work! You're building momentum.",
    "That counts. Everything counts.",
    "Progress! You're doing better than you think.",
    "Added to your list of wins for today.",
  ],
  guiltSpiral: [
    "Hey, I noticed you might be feeling stuck. Let's look at what you HAVE done today.",
    "Feeling unproductive? Let me remind you: you've already accomplished things today.",
    "Remember: productivity isn't about doing more. It's about acknowledging what you do.",
    "Your brain might be telling you that you haven't done enough. Here's proof otherwise.",
  ],
  dailySummary: [
    "Here's everything you accomplished today. You did more than you think.",
    "Look at this list! This is your evidence of a productive day.",
    "Today's accomplishments, collected just for you. Be proud.",
  ],
}

export function getRandomResponse(type: keyof typeof coachResponses): string {
  const responses = coachResponses[type]
  return responses[Math.floor(Math.random() * responses.length)]
}
