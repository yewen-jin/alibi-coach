"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface AckToastProps {
  message: string
  /** unique key per ack so the same phrase re-animates */
  ackKey: string | number
}

export function AckToast({ message, ackKey }: AckToastProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(true)
    const fadeOut = setTimeout(() => setVisible(false), 2400)
    return () => clearTimeout(fadeOut)
  }, [ackKey])

  return (
    <div
      className={cn(
        "pointer-events-none flex justify-center transition-all duration-500",
        visible ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
      )}
      aria-live="polite"
    >
      <span className="font-serif text-sm italic text-muted-foreground">
        {message}
      </span>
    </div>
  )
}
