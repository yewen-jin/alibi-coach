"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut, User } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface HeaderProps {
  userEmail?: string
}

export function Header({ userEmail }: HeaderProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const router = useRouter()

  const handleLogout = async () => {
    setIsLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/auth/login")
    router.refresh()
  }

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-xl text-foreground">alibi</h1>
          <p className="text-xs text-muted-foreground">the friend who remembers your day</p>
        </div>
        
        {userEmail && (
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
              <User className="w-4 h-4" />
              <span className="max-w-[150px] truncate">{userEmail}</span>
            </div>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
              aria-label="Sign out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
