import { redirect } from "next/navigation"
import { deriveCompanionMessageInsightRecord } from "@/lib/chat-insights"
import { createClient } from "@/lib/supabase/server"
import type {
  CompanionConversation,
  CompanionMessage,
  CompanionMessageInsight,
  TimeBlock,
  TimeBlockInsight,
} from "@/lib/types"
import { TopNav } from "@/components/top-nav"
import { DashboardOverview } from "@/components/dashboard/dashboard-overview"

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/")

  const { data: timeBlocks } = await supabase
    .from("time_blocks")
    .select("*")
    .eq("user_id", user.id)
    .not("ended_at", "is", null)
    .order("started_at", { ascending: false })

  const safeBlocks = (timeBlocks ?? []) as TimeBlock[]
  const blockIds = safeBlocks.map((block) => block.id)
  const { data: insights } = blockIds.length
    ? await supabase
        .from("time_block_insights")
        .select("*")
        .eq("user_id", user.id)
        .in("time_block_id", blockIds)
    : { data: [] }
  const safeInsights = (insights ?? []) as TimeBlockInsight[]
  const { data: chatInsights } = await supabase
    .from("companion_message_insights")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(80)
  const safeChatInsights = (chatInsights ?? []) as CompanionMessageInsight[]
  const { data: userMessages } = await supabase
    .from("companion_messages")
    .select("*")
    .eq("user_id", user.id)
    .eq("role", "user")
    .order("created_at", { ascending: false })
    .limit(80)
  const messageBackfillInsights = ((userMessages ?? []) as CompanionMessage[])
    .map((message) =>
      deriveCompanionMessageInsightRecord(
        message,
        {
          kind: message.related_time_block_id
            ? "time_block"
            : "general",
        } satisfies Pick<CompanionConversation, "kind">,
        {
          id: `dashboard-derived-${message.id}`,
          createdAt: message.created_at,
        },
      ),
    )
    .filter((insight): insight is CompanionMessageInsight => Boolean(insight))
  const insightMessageIds = new Set(
    safeChatInsights.map((insight) => insight.message_id),
  )
  const mergedChatInsights = [
    ...safeChatInsights,
    ...messageBackfillInsights.filter(
      (insight) => !insightMessageIds.has(insight.message_id),
    ),
  ]

  return (
    <main className="alibi-page relative w-full">
      <div className="mx-auto flex min-h-screen max-w-[1280px] flex-col gap-6 p-8">
        <TopNav userEmail={user.email ?? null} />

        <header className="px-2 sm:px-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h1 className="text-[1.8rem] font-black tracking-tight text-alibi-blue">
              the dashboard
            </h1>
            <span className="rounded-full bg-alibi-pink/15 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-alibi-pink">
              what you&apos;ve been doing
            </span>
          </div>
          <p className="mt-1 text-base font-semibold leading-relaxed text-alibi-teal">
            a quiet look back. nothing graded, just shown.
          </p>
        </header>

        <DashboardOverview
          blocks={safeBlocks}
          insights={safeInsights}
          chatInsights={mergedChatInsights}
        />

        <footer className="text-center text-sm font-semibold tracking-[0.04em] text-alibi-teal">
          alibi — for the days you can&apos;t see clearly
        </footer>
      </div>
    </main>
  )
}
