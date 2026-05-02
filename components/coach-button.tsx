"use client"

import { useState } from "react"
import { Heart, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface CoachButtonProps {
  onActivate: () => void
  entryCount: number
}

export function CoachButton({ onActivate, entryCount }: CoachButtonProps) {
  const [isAnimating, setIsAnimating] = useState(false)

  const handleClick = () => {
    setIsAnimating(true)
    onActivate()
    setTimeout(() => setIsAnimating(false), 600)
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2.5 rounded-xl",
        "bg-coach-bg border border-coach-border text-coach-text",
        "hover:bg-accent/20 transition-all duration-200",
        "active:scale-95",
        isAnimating && "animate-pulse"
      )}
    >
      <Heart className={cn("w-5 h-5", isAnimating && "animate-bounce")} />
      <span className="text-sm font-medium">
        {entryCount === 0 
          ? "I feel stuck" 
          : "Remind me what I've done"}
      </span>
    </button>
  )
}
