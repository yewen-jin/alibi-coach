import Link from "next/link"
import { redirect } from "next/navigation"
import {
  ArrowRight,
  BookOpen,
  CalendarRange,
  Heart,
  Lock,
  MessageCircleQuestion,
  NotebookPen,
  Route,
  SearchCheck,
  Sparkles,
  Timer,
  type LucideIcon,
} from "lucide-react"
import { TopNav } from "@/components/top-nav"
import { createClient } from "@/lib/supabase/server"

interface WikiSection {
  id: string
  icon: LucideIcon
  title: string
  intro: string
  points: string[]
}

const SECTIONS: WikiSection[] = [
  {
    id: "what-it-is",
    icon: BookOpen,
    title: "what alibi is",
    intro:
      "alibi is a witness for lived time. it helps you keep evidence of what actually happened, especially when the day was messy, mixed, or hard to remember clearly.",
    points: [
      "it is not a planner, todo list, scorecard, or productivity dashboard.",
      "it records completed time, not expectations.",
      "it treats nuanced notes as the most important part of the record.",
      "it uses chat to help you reconstruct details, not to judge or push you.",
    ],
  },
  {
    id: "how-it-works",
    icon: Route,
    title: "how the system works",
    intro:
      "the app has three ways to create the same kind of record: timer, manual block, and chat. all three write to the time-block timeline.",
    points: [
      "a time block gives the note coordinates: date, start, end, duration, category, and tags.",
      "the note explains what really happened inside that time.",
      "chat can start or stop the timer, add a completed block, or ask for missing details.",
      "derived insights are stored beside your notes, but they never replace the original text.",
    ],
  },
  {
    id: "notes",
    icon: NotebookPen,
    title: "how to write useful notes",
    intro:
      "a useful note does not need to be tidy. it should preserve the texture of the block so future-you and the agent can understand what the timestamp alone cannot say.",
    points: [
      "write what you intended to do and what actually happened.",
      "include parallel activity, attention shifts, interruptions, and useful distractions.",
      "name friction: what slowed you down, what you avoided, what felt unclear.",
      "include feeling: guilt, relief, pride, flatness, anxiety, satisfaction, or mixed states.",
      "record outcome without judging it: what moved, what changed, what became clearer.",
      "edit later if your interpretation changes. note history is preserved.",
    ],
  },
  {
    id: "chat",
    icon: MessageCircleQuestion,
    title: "how to make chat useful",
    intro:
      "chat is best when you use it as a reconstruction partner. ask it to help pull out details, feelings, and patterns instead of only asking it to log a clean task.",
    points: [
      "ask it to help reconstruct a messy block when you remember fragments.",
      "ask it to turn a rambling description into a time-block note.",
      "tell it to ask follow-up questions before saving if timing or category is unclear.",
      "ask for evidence-backed reflections, such as what your notes show this week.",
      "use it when you feel like you did nothing; it can read saved blocks back with specifics.",
    ],
  },
  {
    id: "insights",
    icon: SearchCheck,
    title: "how insights should be read",
    intro:
      "insights are interpretations of your evidence. they are useful for pattern spotting, but the raw note and chat history remain the source of truth.",
    points: [
      "the strongest evidence is a note tied to a dated time block.",
      "metadata like category, duration, mood, effort, and tags adds context.",
      "linked chat can explain feelings or missing details around a block.",
      "good observations should point back to dates, blocks, excerpts, or messages.",
    ],
  },
  {
    id: "privacy",
    icon: Lock,
    title: "privacy and data",
    intro:
      "your timeline is stored in your own authenticated account. the app keeps raw input and derived interpretation separate so your words remain intact.",
    points: [
      "row-level security protects time blocks, active timer state, categories, note versions, insights, and chat messages.",
      "timer, manual entry, and chat share the same time-block data structure.",
      "note versions preserve meaningful edits instead of silently losing the old version.",
      "future retrieval should cite source records instead of producing unsupported summaries.",
    ],
  },
]

const NOTE_EXAMPLES = [
  {
    title: "quick version",
    text: "meant to answer email, got pulled into fixing the gallery upload bug. useful detour, but i felt guilty because the invoice is still open.",
  },
  {
    title: "reflection version",
    text: "started with admin. avoided the invoice for about 15 minutes by cleaning up tabs, then actually found the missing receipt. felt scattered but less stuck after that.",
  },
  {
    title: "parallel activity version",
    text: "had the meeting on in the background while editing the proposal. mostly proposal work, but the meeting gave me two useful phrasing changes. energy was low but focus improved near the end.",
  },
]

const CHAT_PROMPTS = [
  "help me reconstruct the last two hours before you save anything.",
  "ask me questions to turn this into a useful note: i bounced between the invoice and gallery bug.",
  "log a block from 2 to 3:15, but help me name what actually happened.",
  "what do my notes this week suggest about when admin turns into avoidance?",
  "i feel like i did nothing today. can you read back the evidence from my blocks?",
  "turn this messy description into a note, and keep the uncertainty in it.",
]

export default async function DocsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/")

  return (
    <main className="alibi-page relative w-full">
      <div className="mx-auto flex min-h-screen max-w-[1180px] flex-col gap-6 p-6 sm:p-8">
        <TopNav userEmail={user.email ?? null} />

        <header className="px-1 sm:px-2">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <span className="alibi-label">wiki</span>
              <h1 className="mt-2 text-[1.9rem] font-black tracking-tight text-alibi-blue">
                how to use alibi well
              </h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/app"
                className="alibi-button-primary inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12px]"
              >
                <Timer className="h-3.5 w-3.5" strokeWidth={2.4} />
                tracker
              </Link>
              <Link
                href="/app/dashboard"
                className="alibi-button-secondary inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12px]"
              >
                <CalendarRange className="h-3.5 w-3.5" strokeWidth={2.4} />
                dashboard
              </Link>
            </div>
          </div>
          <p className="mt-3 max-w-3xl text-[14px] leading-[1.6] text-alibi-teal">
            this page is the working manual for alibi: what it is, how the record is built, how to
            write notes that future-you can actually use, and how to talk to the chat agent when the
            day was too tangled for a clean label.
          </p>
        </header>

        <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="alibi-inset h-fit px-5 py-5 lg:sticky lg:top-6">
            <p className="alibi-label mb-3">on this page</p>
            <nav className="flex flex-col gap-2" aria-label="documentation sections">
              {SECTIONS.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="rounded-[6px] px-2 py-1.5 text-[12.5px] font-semibold text-alibi-teal transition-colors hover:bg-alibi-blue/[0.05] hover:text-alibi-pink"
                >
                  {section.title}
                </a>
              ))}
              <a
                href="#examples"
                className="rounded-[6px] px-2 py-1.5 text-[12.5px] font-semibold text-alibi-teal transition-colors hover:bg-alibi-blue/[0.05] hover:text-alibi-pink"
              >
                note and chat examples
              </a>
              <a
                href="#roadmap"
                className="rounded-[6px] px-2 py-1.5 text-[12.5px] font-semibold text-alibi-teal transition-colors hover:bg-alibi-blue/[0.05] hover:text-alibi-pink"
              >
                where this is going
              </a>
            </nav>
          </aside>

          <div className="flex flex-col gap-5">
            <section className="alibi-inset px-6 py-6">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-alibi-pink/15 text-alibi-pink">
                  <Heart className="h-4 w-4" strokeWidth={2.2} />
                </span>
                <div>
                  <h2 className="text-[17px] font-black tracking-tight text-alibi-blue">
                    the basic idea
                  </h2>
                  <p className="mt-2 text-[14px] leading-[1.7] text-alibi-ink">
                    a clean time tracker assumes work is simple: you planned a task, did it, then
                    stopped. alibi assumes the real day is messier. the timestamp matters, but the
                    note is where the useful truth usually lives.
                  </p>
                </div>
              </div>
            </section>

            {SECTIONS.map((section) => (
              <WikiSectionBlock key={section.id} section={section} />
            ))}

            <section id="examples" className="alibi-card p-6 scroll-mt-6">
              <div className="mb-5 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-alibi-pink" strokeWidth={2.3} />
                <h2 className="text-[17px] font-black tracking-tight text-alibi-blue">
                  note and chat examples
                </h2>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <div>
                  <h3 className="text-[13px] font-black uppercase tracking-[0.06em] text-alibi-teal">
                    useful note shapes
                  </h3>
                  <div className="mt-3 flex flex-col gap-3">
                    {NOTE_EXAMPLES.map((example) => (
                      <article
                        key={example.title}
                        className="rounded-[7px] border border-alibi-blue/10 bg-alibi-cream/65 p-4"
                      >
                        <h4 className="text-[13px] font-semibold text-alibi-ink">
                          {example.title}
                        </h4>
                        <p className="mt-2 font-mono text-[11.5px] leading-[1.6] text-alibi-teal">
                          {example.text}
                        </p>
                      </article>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-[13px] font-black uppercase tracking-[0.06em] text-alibi-teal">
                    prompts that make chat better
                  </h3>
                  <ul className="mt-3 flex flex-col gap-2">
                    {CHAT_PROMPTS.map((prompt) => (
                      <li
                        key={prompt}
                        className="rounded-[7px] border border-alibi-lavender/30 bg-white/55 px-4 py-3 font-mono text-[11.5px] leading-[1.5] text-alibi-teal"
                      >
                        {prompt}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            <section id="roadmap" className="alibi-inset px-6 py-6 scroll-mt-6">
              <h2 className="text-[17px] font-black tracking-tight text-alibi-blue">
                where this is going
              </h2>
              <p className="mt-2 text-[14px] leading-[1.7] text-alibi-ink">
                the next version should make alibi better at extracting structured evidence from
                notes and chat. after that, retrieval can become useful: not generic memory, but
                source-backed patterns connected to dated blocks.
              </p>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <RoadmapCard
                  title="better notes"
                  body="support richer reflection without forcing a form: intended versus actual, attention shifts, friction, feeling, and outcome."
                />
                <RoadmapCard
                  title="better evidence"
                  body="extract small source-linked claims from notes and chat so every pattern can point back to what you wrote."
                />
                <RoadmapCard
                  title="future rag"
                  body="add retrieval only after the evidence model is stable enough to return cited, dated, trustworthy context."
                />
              </div>
            </section>

            <section className="flex flex-col items-center gap-3 px-2 py-6 text-center">
              <p className="text-[13px] text-alibi-teal">
                start with one honest block. messy is useful.
              </p>
              <Link
                href="/app"
                className="alibi-button-primary inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px]"
              >
                open tracker
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.4} />
              </Link>
            </section>
          </div>
        </div>

        <footer className="text-center text-sm font-semibold tracking-[0.04em] text-alibi-teal">
          alibi - for the days you can&apos;t see clearly
        </footer>
      </div>
    </main>
  )
}

function WikiSectionBlock({ section }: { section: WikiSection }) {
  const Icon = section.icon

  return (
    <section id={section.id} className="alibi-card p-6 scroll-mt-6">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-alibi-pink/15 text-alibi-pink">
          <Icon className="h-4 w-4" strokeWidth={2.2} />
        </span>
        <div>
          <h2 className="text-[17px] font-black tracking-tight text-alibi-blue">
            {section.title}
          </h2>
          <p className="mt-2 text-[14px] leading-[1.7] text-alibi-ink">{section.intro}</p>
        </div>
      </div>
      <ul className="mt-5 grid gap-2 md:grid-cols-2">
        {section.points.map((point) => (
          <li
            key={point}
            className="rounded-[7px] border border-alibi-blue/10 bg-alibi-cream/60 px-4 py-3 text-[13px] leading-[1.5] text-alibi-teal"
          >
            {point}
          </li>
        ))}
      </ul>
    </section>
  )
}

function RoadmapCard({ title, body }: { title: string; body: string }) {
  return (
    <article className="rounded-[7px] border border-alibi-blue/10 bg-white/55 p-4">
      <h3 className="text-[13px] font-black uppercase tracking-[0.06em] text-alibi-blue">
        {title}
      </h3>
      <p className="mt-2 text-[12.5px] leading-[1.55] text-alibi-teal">{body}</p>
    </article>
  )
}
