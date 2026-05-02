"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useChat } from "@ai-sdk/react"
import { ArrowUp, Lock, Mic } from "lucide-react"

/* ------------------------------------------------------------------ */
/*  Types & placeholder data                                           */
/* ------------------------------------------------------------------ */

type Project =
  | "deep_work"
  | "admin"
  | "social"
  | "errands"
  | "care"
  | "creative"
  | "rest"

interface DoneEntry {
  id: string
  time: string // "HH:MM"
  text: string
  project: Project
}

interface DayGroup {
  label: string
  count: number
  entries: DoneEntry[]
}

const PLACEHOLDER_DAYS: DayGroup[] = [
  {
    label: "TODAY",
    count: 6,
    entries: [
      { id: "t1", time: "09:14", text: "made coffee, didn't spill it", project: "care" },
      { id: "t2", time: "10:02", text: "replied to nina about the proposal", project: "admin" },
      { id: "t3", time: "11:30", text: "two solid hours on the migration script", project: "deep_work" },
      { id: "t4", time: "13:45", text: "went outside for lunch instead of eating at the desk", project: "rest" },
      { id: "t5", time: "14:20", text: "sketched the new onboarding flow", project: "creative" },
      { id: "t6", time: "16:08", text: "picked up the dry cleaning", project: "errands" },
    ],
  },
  {
    label: "YESTERDAY",
    count: 5,
    entries: [
      { id: "y1", time: "08:45", text: "gym, lower body", project: "care" },
      { id: "y2", time: "10:30", text: "shipped the auth fix", project: "deep_work" },
      { id: "y3", time: "12:15", text: "lunch with sam at the noodle place", project: "social" },
      { id: "y4", time: "15:00", text: "cleared inbox to zero", project: "admin" },
      { id: "y5", time: "19:30", text: "finished the chapter", project: "rest" },
    ],
  },
  {
    label: "WEDNESDAY, MAY 1",
    count: 4,
    entries: [
      { id: "w1", time: "09:00", text: "stand-up — felt prepared for once", project: "social" },
      { id: "w2", time: "11:10", text: "fixed the staging deploy script", project: "deep_work" },
      { id: "w3", time: "14:30", text: "took a real walk, no phone", project: "rest" },
      { id: "w4", time: "17:00", text: "submitted reimbursement", project: "admin" },
    ],
  },
]

/* Project pill: solid hex base, 30% alpha appended (0x4D). */
const PROJECT_PILL: Record<Project, string> = {
  deep_work: "#8B95A84D",
  admin: "#B5A8984D",
  social: "#D49B8C4D",
  errands: "#C9B87A4D",
  care: "#8B9D7F4D",
  creative: "#A89BC84D",
  rest: "#C8B89F4D",
}

const PROJECT_LABEL: Record<Project, string> = {
  deep_work: "deep work",
  admin: "admin",
  social: "social",
  errands: "errands",
  care: "care",
  creative: "creative",
  rest: "rest",
}

/* ------------------------------------------------------------------ */
/*  Shared style constants                                             */
/* ------------------------------------------------------------------ */

const GLASS_PANEL_STYLE: React.CSSProperties = {
  background: "rgba(255, 250, 240, 0.55)",
  backdropFilter: "blur(20px) saturate(140%)",
  WebkitBackdropFilter: "blur(20px) saturate(140%)",
  border: "1px solid rgba(255, 255, 255, 0.6)",
  boxShadow:
    "0 8px 32px rgba(60, 40, 20, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.5), inset 0 -1px 0 rgba(0, 0, 0, 0.06)",
  borderRadius: 16,
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function Alibi() {
  const [input, setInput] = useState("")
  const [recording, setRecording] = useState(false)
  const [filed, setFiled] = useState(false)
  const [todoTooltip, setTodoTooltip] = useState(false)
  const [now, setNow] = useState<string | null>(null)

  const filedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { messages, sendMessage, status } = useChat()
  const isThinking = status === "submitted" || status === "streaming"

  /* Live clock for the empty-state stamp. Computed client-side to avoid hydration drift. */
  useEffect(() => {
    const tick = () => {
      const d = new Date()
      setNow(
        `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
      )
    }
    tick()
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [])

  /* Auto-scroll on new messages. */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages.length, isThinking])

  /* Auto-resize textarea. */
  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }

  const handleSend = useCallback(() => {
    const text = input.trim()
    if (!text || isThinking) return
    sendMessage({ text })
    setInput("")
    if (textareaRef.current) textareaRef.current.style.height = "auto"
    setFiled(true)
    if (filedTimer.current) clearTimeout(filedTimer.current)
    filedTimer.current = setTimeout(() => setFiled(false), 1500)
  }, [input, isThinking, sendMessage])

  return (
    <main className="relative min-h-screen w-full text-[#2A1F14]">
      {/* Page padding 32px, two-column 40/60 with 24px gap, max 1280px */}
      <div className="mx-auto flex min-h-screen max-w-[1280px] flex-col gap-6 p-8">
        <div className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-[40fr_60fr]">
          {/* ─────────────────── LEFT — CHAT ─────────────────── */}
          <section
            className="relative flex flex-col overflow-hidden"
            style={{ ...GLASS_PANEL_STYLE, minHeight: "calc(100vh - 4rem)" }}
          >
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-5">
              <div className="flex items-baseline gap-3">
                <h1 className="text-[1.05rem] font-semibold tracking-tight text-[#2A1F14]">
                  alibi
                </h1>
                <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#A89680]">
                  done-list
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="alibi-listen-dot block h-2 w-2 rounded-full bg-[#8B9D7F]"
                />
                <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#6B5A47]">
                  listening
                </span>
              </div>
            </header>

            <div
              aria-hidden
              className="mx-6"
              style={{ borderTop: "1px solid rgba(60, 40, 20, 0.08)" }}
            />

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {messages.length === 0 ? (
                <div className="flex h-full min-h-[280px] flex-col items-center justify-center text-center">
                  <p className="text-[15px] leading-[1.5] text-[#6B5A47]">
                    nothing on the record yet.
                  </p>
                  <p className="mt-1 text-[13px] text-[#A89680]">
                    tell me what you&apos;ve been up to.
                  </p>
                  <p className="mt-6 font-mono text-[11px] tracking-[0.12em] text-[#C8B89F]">
                    {now ?? "—"}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((m) => {
                    const isUser = m.role === "user"
                    const text = m.parts
                      ?.map((p) => (p.type === "text" ? p.text : ""))
                      .join("") ?? ""
                    if (!text) return null
                    return (
                      <div
                        key={m.id}
                        className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                      >
                        {isUser ? (
                          <div
                            className="alibi-soft-rise max-w-[80%] text-[14.5px] leading-[1.5] text-white"
                            style={{
                              background: "rgba(200, 85, 61, 0.85)",
                              backdropFilter: "blur(12px) saturate(140%)",
                              WebkitBackdropFilter: "blur(12px) saturate(140%)",
                              padding: "12px 16px",
                              borderRadius: 14,
                              boxShadow:
                                "inset 0 1px 0 rgba(255,255,255,0.22), 0 4px 14px rgba(200,85,61,0.18)",
                            }}
                          >
                            {text}
                          </div>
                        ) : (
                          <p
                            className="alibi-soft-rise max-w-[80%] text-[14.5px] leading-[1.5] text-[#2A1F14]"
                            style={{ padding: "12px 16px 12px 0" }}
                          >
                            {text}
                          </p>
                        )}
                      </div>
                    )
                  })}
                  {isThinking && (
                    <p className="px-1 text-[12px] italic tracking-wide text-[#A89680]">
                      noting...
                    </p>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input */}
            <div
              className="px-5 pb-5 pt-3"
              style={{ borderTop: "1px solid rgba(60, 40, 20, 0.06)" }}
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSend()
                }}
              >
                <div
                  className="flex items-end gap-2 px-3 py-2"
                  style={{
                    background: "rgba(244, 237, 224, 0.55)",
                    border: "1px solid rgba(60, 40, 20, 0.08)",
                    borderRadius: 12,
                    boxShadow: "inset 0 1px 3px rgba(60, 40, 20, 0.08)",
                  }}
                >
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value)
                      autoResize(e.target)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleSend()
                      }
                    }}
                    rows={1}
                    placeholder={
                      recording ? "listening..." : "what have you been up to?"
                    }
                    aria-label="chat input"
                    className="flex-1 resize-none border-0 bg-transparent px-1 py-1.5 text-[14.5px] leading-[1.5] text-[#2A1F14] outline-none placeholder:text-[#A89680]"
                  />
                  <button
                    type="button"
                    onClick={() => setRecording((v) => !v)}
                    aria-label={recording ? "stop recording" : "start voice input"}
                    aria-pressed={recording}
                    className={`${
                      recording ? "alibi-record-pulse" : ""
                    } flex h-9 w-9 flex-shrink-0 items-center justify-center transition-colors`}
                    style={{
                      borderRadius: 10,
                      background: recording ? "#C8553D" : "transparent",
                      border: recording
                        ? "1px solid #C8553D"
                        : "1px solid rgba(60, 40, 20, 0.18)",
                      color: recording ? "#FFFFFF" : "#6B5A47",
                    }}
                  >
                    <Mic className="h-4 w-4" strokeWidth={recording ? 2.5 : 2} />
                  </button>
                  <button
                    type="submit"
                    disabled={!input.trim() || isThinking}
                    aria-label="send"
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-white transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                    style={{
                      background: "#C8553D",
                      boxShadow:
                        "0 2px 6px rgba(200, 85, 61, 0.35), inset 0 1px 0 rgba(255,255,255,0.25)",
                    }}
                  >
                    <ArrowUp className="h-4 w-4" strokeWidth={2.6} />
                  </button>
                </div>
              </form>
              <div className="mt-2 h-4 text-center" aria-live="polite">
                {filed && (
                  <span className="alibi-fade-in text-[11px] tracking-[0.05em] text-[#8B9D7F]">
                    filed ✓
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* ─────────────────── RIGHT — RECEIPT ─────────────────── */}
          <section
            className="flex flex-col overflow-hidden"
            style={{ ...GLASS_PANEL_STYLE, minHeight: "calc(100vh - 4rem)" }}
          >
            {/* Tab bar */}
            <div className="flex items-center gap-1 px-6 py-4">
              <Tab active>Done</Tab>
              <TabLocked
                tooltipOpen={todoTooltip}
                onShow={() => setTodoTooltip(true)}
                onHide={() => setTodoTooltip(false)}
              />
              <span className="ml-auto text-[10px] font-medium uppercase tracking-[0.2em] text-[#A89680]">
                on the record
              </span>
            </div>

            <div
              aria-hidden
              className="mx-6"
              style={{ borderTop: "1px solid rgba(60, 40, 20, 0.08)" }}
            />

            {/* Receipt — thermal-paper inset */}
            <div className="flex-1 p-5">
              <div
                className="relative h-full overflow-y-auto"
                style={{
                  background:
                    "linear-gradient(180deg, #F8F1E3 0%, #F4ECDA 100%)",
                  borderRadius: 12,
                  boxShadow:
                    "inset 0 2px 6px rgba(60, 40, 20, 0.08), inset 0 -1px 0 rgba(255,255,255,0.6)",
                }}
              >
                {/* Faint paper grain — pure CSS, no assets. */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0"
                  style={{
                    opacity: 0.06,
                    borderRadius: 12,
                    backgroundImage:
                      "radial-gradient(circle at 1px 1px, rgba(60,40,20,0.7) 1px, transparent 0)",
                    backgroundSize: "3px 3px",
                  }}
                />

                <div className="relative px-7 py-7">
                  {PLACEHOLDER_DAYS.length === 0 ? (
                    <EmptyReceipt now={now} />
                  ) : (
                    PLACEHOLDER_DAYS.map((day, i) => (
                      <DaySection key={day.label} day={day} first={i === 0} />
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>

        <footer className="text-center text-[11px] tracking-[0.04em] text-[#A89680]">
          alibi — for the days you can&apos;t see clearly
        </footer>
      </div>
    </main>
  )
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function Tab({
  active,
  children,
}: {
  active?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-selected={active}
      className="px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] transition-colors"
      style={
        active
          ? {
              borderRadius: 10,
              background: "rgba(255, 255, 255, 0.65)",
              color: "#2A1F14",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.7), 0 1px 0 rgba(60,40,20,0.06)",
            }
          : {
              borderRadius: 10,
              background: "transparent",
              color: "#6B5A47",
            }
      }
    >
      {children}
    </button>
  )
}

function TabLocked({
  tooltipOpen,
  onShow,
  onHide,
}: {
  tooltipOpen: boolean
  onShow: () => void
  onHide: () => void
}) {
  return (
    <span
      tabIndex={0}
      role="button"
      aria-disabled
      onMouseEnter={onShow}
      onMouseLeave={onHide}
      onFocus={onShow}
      onBlur={onHide}
      className="relative flex cursor-not-allowed items-center gap-1.5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#A89680] outline-none focus-visible:ring-2 focus-visible:ring-[#C8553D]/30"
      style={{ borderRadius: 10 }}
    >
      <Lock className="h-3 w-3" strokeWidth={2.5} />
      Todo
      {tooltipOpen && (
        <span
          role="tooltip"
          className="alibi-fade-in absolute left-1/2 top-full z-10 mt-2 -translate-x-1/2 whitespace-nowrap px-3 py-1.5 text-[11px] normal-case tracking-normal text-[#C8553D]"
          style={{
            background: "rgba(255, 250, 240, 0.85)",
            backdropFilter: "blur(16px) saturate(140%)",
            WebkitBackdropFilter: "blur(16px) saturate(140%)",
            border: "1px solid rgba(255, 255, 255, 0.6)",
            borderRadius: 10,
            boxShadow:
              "0 8px 24px rgba(60, 40, 20, 0.14), inset 0 1px 0 rgba(255,255,255,0.5)",
          }}
        >
          we don&apos;t do that here.
        </span>
      )}
    </span>
  )
}

function EmptyReceipt({ now }: { now: string | null }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <p className="text-[15px] leading-[1.5] text-[#6B5A47]">
        nothing on the record yet.
      </p>
      <p className="mt-1 text-[13px] text-[#A89680]">
        tell me what you&apos;ve been up to.
      </p>
      <p className="mt-6 font-mono text-[11px] tracking-[0.12em] text-[#C8B89F]">
        {now ?? "—"}
      </p>
    </div>
  )
}

function DaySection({ day, first }: { day: DayGroup; first: boolean }) {
  return (
    <section className={first ? "" : "mt-7"}>
      <div className="mb-2 flex items-baseline gap-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#2A1F14]">
          {day.label}
        </h2>
        <hr className="flex-1 border-0" style={{ borderTop: "1px dashed #C8B89F" }} />
        <span className="font-mono text-[10px] tracking-[0.12em] text-[#A89680]">
          {String(day.count).padStart(2, "0")} ITEMS
        </span>
      </div>

      <ul>
        {day.entries.map((entry, idx) => (
          <li key={entry.id} className="alibi-soft-rise">
            <ReceiptRow entry={entry} />
            {idx < day.entries.length - 1 && (
              <hr
                className="border-0"
                style={{ borderTop: "1px dashed rgba(200, 184, 159, 0.55)" }}
              />
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

function ReceiptRow({ entry }: { entry: DoneEntry }) {
  return (
    <div
      className="group flex items-center gap-4 px-2 py-2.5 transition-colors hover:bg-[#F8F1E3]"
      style={{ borderRadius: 6 }}
    >
      <span
        className="flex-shrink-0 font-mono text-[12px] tracking-[0.06em] text-[#6B5A47]"
        style={{ width: "3.25rem" }}
      >
        {entry.time}
      </span>
      <span className="flex-1 text-[14px] leading-[1.5] text-[#2A1F14]">
        {entry.text}
      </span>
      <span
        className="flex-shrink-0 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.1em]"
        style={{
          background: PROJECT_PILL[entry.project],
          color: "#2A1F14",
          borderRadius: 6,
        }}
      >
        {PROJECT_LABEL[entry.project]}
      </span>
    </div>
  )
}
