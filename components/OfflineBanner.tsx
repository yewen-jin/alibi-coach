"use client"

import { useEffect, useState } from "react"

export function OfflineBanner() {
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    setOffline(!navigator.onLine)
    const handleOnline = () => setOffline(false)
    const handleOffline = () => setOffline(true)
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  if (!offline) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 alibi-card px-4 py-2 text-sm text-alibi-ink flex items-center gap-2 whitespace-nowrap">
      <span className="w-2 h-2 rounded-full bg-alibi-pink inline-block shrink-0" />
      You&apos;re offline — changes won&apos;t save until you reconnect.
    </div>
  )
}
