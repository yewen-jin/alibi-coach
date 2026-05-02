import Link from "next/link"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams

  return (
    <main className="flex min-h-svh w-full items-center justify-center bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          <h1 className="font-serif text-2xl text-foreground">
            something went sideways.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {params?.error
              ? `we hit an error: ${params.error}`
              : "an unspecified error occurred. that's on us, not you."}
          </p>
          <div className="mt-6">
            <Link
              href="/auth/login"
              className="inline-flex items-center text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              back to login
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
