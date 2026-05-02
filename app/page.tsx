import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DoneListApp } from "@/components/done-list-app"

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Fetch initial entries
  const { data: entries } = await supabase
    .from("entries")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50)

  return (
    <DoneListApp 
      initialEntries={entries ?? []} 
      userEmail={user.email ?? ""} 
    />
  )
}
