import { redirect } from "next/navigation"
import { getCoachHasPendingDraft, getCoachMessages } from "@/app/actions/process-message"
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

  const [coachMessages, hasPendingDraft] = await Promise.all([
    getCoachMessages(),
    getCoachHasPendingDraft(),
  ])

  return (
    <TimerTrackerApp
      userEmail={user.email ?? null}
      initialChatMessages={coachMessages}
      initialHasPendingDraft={hasPendingDraft}
    />
  )
}
