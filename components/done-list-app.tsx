"use client"

import { useState, useCallback } from "react"
import useSWR, { mutate } from "swr"
import { Header } from "./header"
import { EntryInput } from "./entry-input"
import { EntryList } from "./entry-list"
import { CoachResponse, getRandomResponse } from "./coach-response"
import { CoachButton } from "./coach-button"
import { DailyReceipt } from "./daily-receipt"
import { createClient } from "@/lib/supabase/client"
import type { Entry } from "@/lib/types"
import { Receipt } from "lucide-react"

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
    .limit(50)

  if (error) throw error
  return data as Entry[]
}

export function DoneListApp({ initialEntries, userEmail, userId }: DoneListAppProps) {
  const [coachMessage, setCoachMessage] = useState<string | null>(null)
  const [coachType, setCoachType] = useState<"encouragement" | "reframe" | "celebration">("encouragement")
  const [showReceipt, setShowReceipt] = useState(false)

  const { data: entries = initialEntries } = useSWR("entries", fetcher, {
    fallbackData: initialEntries,
    revalidateOnFocus: false,
  })

  const todayEntries = entries.filter((entry) => {
    const entryDate = new Date(entry.created_at)
    const today = new Date()
    return (
      entryDate.getDate() === today.getDate() &&
      entryDate.getMonth() === today.getMonth() &&
      entryDate.getFullYear() === today.getFullYear()
    )
  })

  const handleAddEntry = useCallback(async (content: string) => {
    const supabase = createClient()
    
    const newEntry: Partial<Entry> = {
      content,
      user_id: userId,
    }

    // Optimistically update the UI
    const optimisticEntry: Entry = {
      id: crypto.randomUUID(),
      user_id: userId,
      content,
      project: null,
      mood: null,
      duration_minutes: null,
      created_at: new Date().toISOString(),
    }

    mutate("entries", [optimisticEntry, ...entries], false)

    const { data, error } = await supabase
      .from("entries")
      .insert(newEntry)
      .select()
      .single()

    if (error) {
      // Revert on error
      mutate("entries", entries, false)
      throw error
    }

    // Update with real data
    mutate("entries", [data, ...entries.filter(e => e.id !== optimisticEntry.id)], false)

    // Show coach encouragement
    setCoachType("celebration")
    setCoachMessage(getRandomResponse("newEntry"))
  }, [entries, userId])

  const handleCoachActivate = useCallback(() => {
    if (todayEntries.length === 0) {
      setCoachType("reframe")
      setCoachMessage(
        "It's okay to have slow days. The fact that you're here, trying to track things, shows you care. That counts for something."
      )
    } else {
      setCoachType("encouragement")
      setCoachMessage(getRandomResponse("guiltSpiral"))
    }
  }, [todayEntries.length])

  const handleDeleteEntry = useCallback(async (id: string) => {
    const supabase = createClient()
    
    // Optimistically remove
    mutate("entries", entries.filter(e => e.id !== id), false)

    const { error } = await supabase
      .from("entries")
      .delete()
      .eq("id", id)

    if (error) {
      // Revert on error
      mutate("entries", entries, false)
    }
  }, [entries])

  return (
    <div className="min-h-screen flex flex-col">
      <Header userEmail={userEmail} />
      
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 space-y-6">
        {/* Entry Input */}
        <EntryInput onSubmit={handleAddEntry} />

        {/* Coach Button */}
        <div className="flex justify-center">
          <CoachButton onActivate={handleCoachActivate} entryCount={todayEntries.length} />
        </div>

        {/* Coach Response */}
        {coachMessage && (
          <CoachResponse
            message={coachMessage}
            type={coachType}
            onDismiss={() => setCoachMessage(null)}
          />
        )}

        {/* Daily Receipt Toggle */}
        {todayEntries.length > 0 && (
          <button
            onClick={() => setShowReceipt(!showReceipt)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto"
          >
            <Receipt className="w-4 h-4" />
            {showReceipt ? "Hide" : "Show"} today&apos;s receipt ({todayEntries.length} done)
          </button>
        )}

        {/* Daily Receipt */}
        {showReceipt && todayEntries.length > 0 && (
          <DailyReceipt entries={todayEntries} />
        )}

        {/* Entry List */}
        <EntryList entries={entries} onDelete={handleDeleteEntry} />
      </main>

      <footer className="text-center py-4 text-xs text-muted-foreground border-t border-border">
        <p>Every accomplishment matters. You&apos;re doing great.</p>
      </footer>
    </div>
  )
}
