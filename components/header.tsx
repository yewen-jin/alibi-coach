"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutGrid, LogOut, MessageCircle, User } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

interface HeaderProps {
  userEmail?: string
}

export function Header({ userEmail }: HeaderProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  const handleLogout = async () => {
    setIsLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/auth/login")
    router.refresh()
  }

  const navItems = [
    { href: "/", label: "chat", icon: MessageCircle },
    { href: "/dashboard", label: "dashboard", icon: LayoutGrid },
  ]

  return (
    <header className="sticky top-0 z-10 border-b border-alibi-blue/12 bg-white">
      <div className="flex items-center justify-between px-4 py-3 lg:px-6">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-xl font-black text-alibi-blue">alibi</h1>
            <p className="text-xs font-semibold text-alibi-teal">
              the friend who remembers your day
            </p>
          </div>

          {userEmail && (
            <nav className="flex items-center gap-1">
              {navItems.map((item) => {
                const active = pathname === item.href
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-sm font-bold transition-colors",
                      active
                        ? "bg-alibi-lavender/20 text-alibi-blue"
                        : "text-alibi-teal hover:bg-alibi-lavender/15 hover:text-alibi-pink"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{item.label}</span>
                  </Link>
                )
              })}
            </nav>
          )}
        </div>

        {userEmail && (
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 text-sm font-semibold text-alibi-teal sm:flex">
              <User className="h-4 w-4" />
              <span className="max-w-[150px] truncate">{userEmail}</span>
            </div>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="rounded-2xl p-2 text-alibi-teal transition-colors hover:bg-alibi-lavender/15 hover:text-alibi-pink disabled:opacity-50"
              aria-label="Sign out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
