import { Mail } from "lucide-react"
import Link from "next/link"

export default function SignUpSuccessPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-accent/20 flex items-center justify-center">
          <Mail className="w-8 h-8 text-accent" />
        </div>
        <h1 className="font-serif text-2xl text-foreground mb-3">Check your email</h1>
        <p className="text-muted-foreground mb-6">
          We&apos;ve sent you a confirmation link. Click it to activate your account and start tracking your accomplishments.
        </p>
        <Link
          href="/auth/login"
          className="text-primary hover:underline text-sm"
        >
          Back to login
        </Link>
      </div>
    </div>
  )
}
