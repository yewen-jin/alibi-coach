"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { BookOpen, LayoutGrid, LogOut, MessageCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { GLASS_PILL_STYLE } from "@/lib/ui-styles"
import { cn } from "@/lib/utils"

const LINKS = [
  { href: "/app", label: "chat", icon: MessageCircle },
  { href: "/app/dashboard", label: "dashboard", icon: LayoutGrid },
  { href: "/app/docs", label: "docs", icon: BookOpen },
]

interface TopNavProps {
  userEmail?: string | null
}

/**
 * TopNav — primary navigation strip.
 * Glass pill matching the warm-cream alibi aesthetic.
 * Used at the top of /, /dashboard, and /docs.
 */
export function TopNav({ userEmail }: TopNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)

  const handleSignOut = async () => {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  return (
    <nav
      aria-label="primary"
      className="flex items-center justify-between gap-3 px-3 py-2"
      style={GLASS_PILL_STYLE}
    >
      {/* Brand */}
      <Link
        href="/app"
        className="flex items-baseline gap-2 px-2 transition-opacity hover:opacity-80"
      >
        <span className="text-[15px] font-semibold tracking-tight text-[#2A1F14]">
          alibi
        </span>
        <span className="hidden text-[10px] font-medium uppercase tracking-[0.18em] text-[#A89680] sm:inline">
          done-list
        </span>
      </Link>

      {/* Links */}
      <ul className="flex items-center gap-1">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href === "/app" && pathname === "/app")
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors",
                  active
                    ? "bg-[#C8553D]/15 text-[#C8553D]"
                    : "text-[#6B5A47] hover:bg-white/40 hover:text-[#2A1F14]"
                )}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            </li>
          )
        })}
      </ul>

      {/* Email + sign out */}
      <div className="flex items-center gap-2">
        {userEmail && (
          <span
            className="hidden max-w-[180px] truncate font-mono text-[11px] tracking-[0.04em] text-[#A89680] md:inline"
            title={userEmail}
          >
            {userEmail}
          </span>
        )}
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          aria-label="sign out"
          className="flex h-8 w-8 items-center justify-center rounded-full text-[#6B5A47] transition-colors hover:bg-white/40 hover:text-[#2A1F14] disabled:opacity-50"
        >
          <LogOut className="h-3.5 w-3.5" strokeWidth={2.2} />
        </button>
      </div>
    </nav>
  )
}
