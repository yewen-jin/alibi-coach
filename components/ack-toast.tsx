"use client"

interface AckToastProps {
  message: string
  /** unique key per ack so the same phrase re-animates */
  ackKey: string | number
}

export function AckToast({ message, ackKey }: AckToastProps) {
  return (
    <div
      key={ackKey}
      className="alibi-soft-rise pointer-events-none flex justify-center"
      aria-live="polite"
    >
      <span className="font-serif text-sm italic text-muted-foreground">
        {message}
      </span>
    </div>
  )
}
