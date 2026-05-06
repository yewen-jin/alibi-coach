export function getSiteURL() {
  let url =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL ??
        process.env.NEXT_PUBLIC_VERCEL_URL ??
        "http://localhost:3000"

  url = url.startsWith("http") ? url : `https://${url}`
  url = url.endsWith("/") ? url : `${url}/`

  return url
}

export function getAuthCallbackURL(next = "/app") {
  const url = new URL("auth/callback", getSiteURL())
  url.searchParams.set("next", next)
  return url.toString()
}
