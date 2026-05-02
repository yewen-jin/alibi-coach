"use client"

import { useCallback, useEffect, useState } from "react"
import { mutate } from "swr"

import { Header } from "./header"
import { EntryInput } from "./entry-input"
import { CoachResponse } from "./coach-response"
import { AckToast } from "./ack-toast"
import { ProactiveBubble } from "./proactive-bubble"
import { processMessage } from "@/app/actions/process-message"
import {
  getUnreadProactiveMessages,
  markProactiveMessageRead,
} from "@/app/actions/proactive-messages"
import type { Entry, ProactiveMessage } from "@/lib/types"

interface DoneListAppProps {
  initialEntries: Entry[]
  userEmail: string
}

export function DoneListApp({ userEmail }: DoneListAppProps) {
  const [coachMessage, setCoachMessage] = useState<string | null>(null)
  const [ack, setAck] = useState<{ text: string; key: number } | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [proactive, setProactive] = useState<ProactiveMessage[]>([])

  // On mount, load any unread proactive messages so the user sees what
  // Alibi has been thinking while they were away.
  useEffect(() => {
    let cancelled = false
    getUnreadProactiveMessages()
      .then((msgs) => {
        if (!cancelled) setProactive(msgs)
      })
      .catch(() => {
        // best-effort
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleMessage = useCallback(async (text: string) => {
    setErrorMessage(null)
    setCoachMessage(null)

    try {
      const result = await processMessage(text)

      if (result.type === "error") {
        setErrorMessage(result.message)
        return
      }

      if (result.type === "drop_in") {
        await mutate(
          "entries",
          (current: Entry[] | undefined) => [result.entry, ...(current ?? [])],
          { revalidate: false }
        )
        setAck({ text: result.ack, key: Date.now() })

        // If Alibi decided to speak up, append the new proactive message.
        if (result.proactive) {
          setProactive((prev) => [...prev, result.proactive!])
        }
        return
      }

      setCoachMessage(result.reflection)
    } catch (err) {
      console.log("[v0] processMessage error:", err)
      setErrorMessage("something went sideways. try again.")
    }
  }, [])

  const handleDismissProactive = useCallback(async (id: string) => {
    setProactive((prev) => prev.filter((m) => m.id !== id))
    try {
      await markProactiveMessageRead(id)
    } catch {
      // best-effort
    }
  }, [])

  const hasContent =
    coachMessage || ack || errorMessage || proactive.length > 0

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header userEmail={userEmail} />

      <main className="flex flex-1 flex-col">
        {/* Conversation area */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="mx-auto flex min-h-full max-w-xl flex-col justify-end space-y-4">
            {/* Proactive Alibi messages — Alibi speaking first */}
            {proactive.map((msg) => (
              <ProactiveBubble
                key={msg.id}
                message={msg}
                onDismiss={handleDismissProactive}
              />
            ))}

            {/* Coach reflection */}
            {coachMessage && (
              <CoachResponse
                message={coachMessage}
                onDismiss={() => setCoachMessage(null)}
              />
            )}

            {/* Drop-in acknowledgment */}
            {ack && <AckToast message={ack.text} ackKey={ack.key} />}

            {/* Error */}
            {errorMessage && (
              <p className="text-center text-sm text-destructive" role="alert">
                {errorMessage}
              </p>
            )}

            {/* Empty state — only show when nothing else is on screen */}
            {!hasContent && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="font-serif text-lg text-muted-foreground">
                  hey. what&apos;s on your mind?
                </p>
                <p className="mt-2 max-w-xs text-sm text-muted-foreground/70">
                  tell me what you did, or how you&apos;re feeling. i&apos;ll keep track.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Input pinned to bottom */}
        <div className="border-t border-border bg-card/50 p-4">
          <div className="mx-auto max-w-xl">
            <EntryInput onSubmit={handleMessage} />
          </div>
        </div>
      </main>

      <footer className="border-t border-border py-3 text-center text-xs text-muted-foreground">
        <p>alibi · the friend who remembers your day.</p>
      </footer>
    </div>
  )
}
