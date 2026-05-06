"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { getAuthCallbackURL } from "@/lib/auth-url"
import { createClient } from "@/lib/supabase/client"
import type { Provider } from "@supabase/supabase-js"

export default function SignUpPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<Provider | null>(null)
  const [fromDemo, setFromDemo] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setFromDemo(new URLSearchParams(window.location.search).get("from") === "demo")
  }, [])

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const nextPath = fromDemo ? "/app" : "/auth/sign-up-success"
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: getAuthCallbackURL(nextPath),
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push(fromDemo ? "/app" : "/auth/sign-up-success")
  }

  const handleOAuthSignUp = async (provider: Extract<Provider, "google" | "github">) => {
    setOauthLoading(provider)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: getAuthCallbackURL("/app"),
      },
    })

    if (error) {
      setError(error.message)
      setOauthLoading(null)
    }
  }

  return (
    <main className="alibi-page flex items-center justify-center px-4 py-12 sm:px-6">
      <section className="alibi-card-pop w-full max-w-md p-7 sm:p-8">
        <div className="mb-8 text-center">
          <p className="alibi-label">auth</p>
          <h1 className="mt-3 text-[1.8rem] font-black tracking-tight text-alibi-blue">
            say hi to alibi
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-alibi-teal">
            {fromDemo
              ? "create an account, then import your demo blocks."
              : "a witness with a warm voice. no planning required."}
          </p>
        </div>

        <form onSubmit={handleSignUp} className="space-y-4">
          {error && (
            <div className="rounded-2xl border-2 border-alibi-pink/25 bg-alibi-pink/10 p-3 text-sm font-semibold text-alibi-pink">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="alibi-label mb-1.5 block">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="alibi-input h-11 w-full placeholder:text-alibi-teal/60"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="alibi-label mb-1.5 block">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="alibi-input h-11 w-full placeholder:text-alibi-teal/60"
              placeholder="At least 6 characters"
            />
          </div>

          <button
            type="submit"
            disabled={loading || Boolean(oauthLoading)}
            className="alibi-button-primary h-11 w-full text-sm disabled:cursor-not-allowed"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-alibi-blue/15" />
          <span className="alibi-label text-alibi-teal/70">or</span>
          <div className="h-px flex-1 bg-alibi-blue/15" />
        </div>

        <div className="space-y-3">
          <button
            type="button"
            disabled={loading || Boolean(oauthLoading)}
            onClick={() => handleOAuthSignUp("google")}
            className="alibi-button-secondary h-11 w-full text-sm disabled:cursor-not-allowed"
          >
            {oauthLoading === "google" ? "Continuing with Google..." : "Continue with Google"}
          </button>

          <button
            type="button"
            disabled={loading || Boolean(oauthLoading)}
            onClick={() => handleOAuthSignUp("github")}
            className="alibi-button-secondary h-11 w-full text-sm disabled:cursor-not-allowed"
          >
            {oauthLoading === "github" ? "Continuing with GitHub..." : "Continue with GitHub"}
          </button>
        </div>

        <p className="mt-6 text-center text-sm font-semibold text-alibi-teal">
          Already have an account?{" "}
          <Link
            href={fromDemo ? "/auth/login?from=demo" : "/auth/login"}
            className="font-bold text-alibi-blue transition-colors hover:text-alibi-pink"
          >
            Sign in
          </Link>
        </p>
      </section>
    </main>
  )
}
