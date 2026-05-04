import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { TimerTrackerApp } from "@/components/timer-tracker-app"

export default async function AppPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  return <TimerTrackerApp userEmail={user.email ?? null} />
}
