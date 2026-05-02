import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Alibi } from "@/components/alibi"

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  return <Alibi userEmail={user.email ?? null} />
}
