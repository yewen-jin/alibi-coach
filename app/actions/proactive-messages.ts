"use server"

import { createClient } from "@/lib/supabase/server"
import type { ProactiveMessage } from "@/lib/types"

/** Get unread proactive messages for the current user. */
export async function getUnreadProactiveMessages(): Promise<ProactiveMessage[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from("proactive_messages")
    .select("*")
    .eq("user_id", user.id)
    .is("read_at", null)
    .order("created_at", { ascending: true })

  return (data ?? []) as ProactiveMessage[]
}

/** Mark a single proactive message as read. */
export async function markProactiveMessageRead(id: string): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from("proactive_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
}
