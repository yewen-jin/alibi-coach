"use client"

import { useCallback, useState } from "react"
import useSWR, { mutate } from "swr"
import { Receipt, CheckCircle, Lock } from "lucide-react"

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

export function DoneListApp({ initialEntries, userEmail }: DoneListAppProps) {
  const [coachMessage, setCoachMessage] = useState<string | null>(null)
  const [ack, setAck] = useState<{ text: string; key: number } | null>(null)
  const [showReceipt, setShowReceipt] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"done" | "receipt">("done")

  const { data: entries = initialEntries } = useSWR("entries", fetcher, {
    fallbackData: initialEntries,
    revalidateOnFocus: false,
  })

  const todayEntries = entries.filter((e) => isToday(e.created_at))

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
        return
      }

      setCoachMessage(result.reflection)
    } catch (err) {
      console.log("[v0] processMessage error:", err)
      setErrorMessage("something went sideways. try again.")
    }
  }, [])

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
    <div className="flex min-h-screen flex-col bg-background">
      <Header userEmail={userEmail} />

      {/* Two-column layout on desktop */}
      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Left: Chat panel (40% on desktop) */}
        <section className="flex flex-col border-b border-border bg-card/30 lg:w-[40%] lg:border-b-0 lg:border-r">
          <div className="flex-1 overflow-y-auto p-4 lg:p-6">
            <div className="mx-auto max-w-md space-y-4">
              {/* Coach response appears here in chat column */}
              {coachMessage && (
                <CoachResponse
                  message={coachMessage}
                  onDismiss={() => setCoachMessage(null)}
                />
              )}

              {/* Ack toast */}
              {ack && <AckToast message={ack.text} ackKey={ack.key} />}

              {/* Error message */}
              {errorMessage && (
                <p className="text-center text-sm text-destructive" role="alert">
                  {errorMessage}
                </p>
              )}
            </div>
          </div>

          {/* Input pinned to bottom of chat column */}
          <div className="border-t border-border bg-card/50 p-4">
            <div className="mx-auto max-w-md">
              <EntryInput onSubmit={handleMessage} />
            </div>
          </div>
        </section>

        {/* Right: Done list / Receipt (60% on desktop) */}
        <section className="flex flex-1 flex-col lg:w-[60%]">
          {/* Tab bar for right panel */}
          <div className="flex items-center justify-between border-b border-border px-4 py-2 lg:px-6">
            <nav className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab("done")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === "done"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <CheckCircle className="h-3.5 w-3.5" />
                done
                <span className="text-xs text-muted-foreground">
                  · {todayEntries.length}
                </span>
              </button>

              {todayEntries.length > 0 && (
                <button
                  onClick={() => setActiveTab("receipt")}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    activeTab === "receipt"
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Receipt className="h-3.5 w-3.5" />
                  receipt
                </button>
              )}

              {/* Locked todo tab */}
              <span
                className="group relative flex cursor-not-allowed items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground/40"
                title="we don't do that here"
              >
                <Lock className="h-3 w-3" />
                todo
                <span className="pointer-events-none absolute -bottom-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-2 py-1 text-xs text-background opacity-0 transition-opacity group-hover:opacity-100">
                  we don&apos;t do that here
                </span>
              </span>
            </nav>
          </div>

          {/* Panel content */}
          <div className="flex-1 overflow-y-auto p-4 lg:p-6">
            {activeTab === "done" && (
              <EntryList entries={entries} onDelete={handleDeleteEntry} />
            )}
            {activeTab === "receipt" && todayEntries.length > 0 && (
              <DailyReceipt entries={todayEntries} />
            )}
          </div>
        </section>
      </div>

      <footer className="border-t border-border py-3 text-center text-xs text-muted-foreground">
        <p>alibi · the friend who remembers your day.</p>
      </footer>
    </div>
  )
}
