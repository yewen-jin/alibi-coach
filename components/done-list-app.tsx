"use client"

import { useCallback, useState } from "react"
import useSWR, { mutate } from "swr"
import { Receipt } from "lucide-react"

import { Header } from "./header"
import { EntryInput } from "./entry-input"
import { EntryList } from "./entry-list"
import { CoachResponse } from "./coach-response"
import { AckToast } from "./ack-toast"
import { DailyReceipt } from "./daily-receipt"
import { createClient } from "@/lib/supabase/client"
import { processMessage } from "@/app/actions/process-message"
import type { Entry } from "@/lib/types"

interface DoneListAppProps {
  initialEntries: Entry[]
  userEmail: string
  userId: string
}

const fetcher = async () => {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("entries")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100)

  if (error) throw error
  return data as Entry[]
}

function isToday(iso: string) {
  const d = new Date(iso)
  const t = new Date()
  return (
    d.getDate() === t.getDate() &&
    d.getMonth() === t.getMonth() &&
    d.getFullYear() === t.getFullYear()
  )
}

export function DoneListApp({ initialEntries, userEmail, userId }: DoneListAppProps) {
  const [coachMessage, setCoachMessage] = useState<string | null>(null)
  const [ack, setAck] = useState<{ text: string; key: number } | null>(null)
  const [showReceipt, setShowReceipt] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const { data: entries = initialEntries } = useSWR("entries", fetcher, {
    fallbackData: initialEntries,
    revalidateOnFocus: false,
  })

  const todayEntries = entries.filter((e) => isToday(e.created_at))

  const handleMessage = useCallback(
    async (text: string) => {
      setErrorMessage(null)

      // Clear any open coach reflection so the new interaction is clean.
      setCoachMessage(null)

      try {
        const result = await processMessage(text)

        if (result.type === "error") {
          setErrorMessage(result.message)
          return
        }

        if (result.type === "drop_in") {
          // Add the entry locally and show the warm ack.
          await mutate(
            "entries",
            (current: Entry[] | undefined) => [result.entry, ...(current ?? [])],
            { revalidate: false }
          )
          setAck({ text: result.ack, key: Date.now() })
          return
        }

        // check_in
        setCoachMessage(result.reflection)
      } catch (err) {
        console.log("[v0] processMessage error:", err)
        setErrorMessage("something went sideways. try again.")
      }
    },
    []
  )

  const handleDeleteEntry = useCallback(
    async (id: string) => {
      const supabase = createClient()
      const previous = entries

      await mutate(
        "entries",
        previous.filter((e) => e.id !== id),
        { revalidate: false }
      )

      const { error } = await supabase.from("entries").delete().eq("id", id)
      if (error) {
        await mutate("entries", previous, { revalidate: false })
      }
    },
    [entries]
  )

  return (
    <div className="flex min-h-screen flex-col">
      <Header userEmail={userEmail} />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 space-y-6">
        <EntryInput onSubmit={handleMessage} />

        {ack && <AckToast message={ack.text} ackKey={ack.key} />}

        {errorMessage && (
          <p className="text-center text-sm text-destructive" role="alert">
            {errorMessage}
          </p>
        )}

        {coachMessage && (
          <CoachResponse
            message={coachMessage}
            onDismiss={() => setCoachMessage(null)}
          />
        )}

        {todayEntries.length > 0 && (
          <div className="flex justify-center">
            <button
              onClick={() => setShowReceipt(!showReceipt)}
              className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Receipt className="h-4 w-4" />
              {showReceipt ? "hide" : "show"} today&apos;s receipt
              <span className="text-muted-foreground/70">
                · {todayEntries.length}
              </span>
            </button>
          </div>
        )}

        {showReceipt && todayEntries.length > 0 && (
          <DailyReceipt entries={todayEntries} />
        )}

        <EntryList entries={entries} onDelete={handleDeleteEntry} />
      </main>

      <footer className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        <p>alibi · the friend who remembers your day.</p>
      </footer>
    </div>
  )
}
