"use server"

import { createClient } from "@/lib/supabase/server"
import type { Entry } from "@/lib/types"

/**
 * Fetch the current user's entries, newest first.
 * Returns [] if the user is not authenticated, so the caller can render an empty state.
 */
export async function getEntries(): Promise<Entry[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from("entries")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    console.log("[v0] getEntries error:", error.message)
    return []
  }
  return (data ?? []) as Entry[]
}
