import { redirect } from "next/navigation"
import { getCompanionThread } from "@/app/actions/process-message"
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

  const companionThread = await getCompanionThread()

  return (
    <TimerTrackerApp
      userEmail={user.email ?? null}
      initialCompanionThread={companionThread ?? undefined}
    />
  )
}
