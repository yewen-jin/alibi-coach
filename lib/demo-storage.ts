export const DEMO_SESSION_STORAGE_KEY = "alibi_demo_session_v1"

export interface DemoStoredBlock {
  id: string
  started_at: string
  ended_at: string | null
  task_name: string | null
  category: string | null
  hashtags: string[]
  notes: string | null
  created_at: string
  updated_at: string
}

export interface DemoStoredMessage {
  id: string
  role: "user" | "assistant"
  text: string
  created_at: string
}

export interface DemoStoredSession {
  version: 1
  name: string
  active_timer: {
    started_at: string
    resumed_block?: DemoStoredBlock
  } | null
  blocks: DemoStoredBlock[]
  messages: DemoStoredMessage[]
  block_threads?: Record<string, DemoStoredMessage[]>
  updated_at: string
}

export function readDemoSession(): DemoStoredSession | null {
  if (typeof window === "undefined") return null

  try {
    const raw = window.localStorage.getItem(DEMO_SESSION_STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as Partial<DemoStoredSession>
    if (parsed.version !== 1 || typeof parsed.name !== "string") return null

    return {
      version: 1,
      name: parsed.name,
      active_timer: parsed.active_timer ?? null,
      blocks: Array.isArray(parsed.blocks) ? parsed.blocks : [],
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
      block_threads:
        parsed.block_threads && typeof parsed.block_threads === "object"
          ? parsed.block_threads
          : {},
      updated_at: parsed.updated_at ?? new Date().toISOString(),
    }
  } catch {
    return null
  }
}

export function writeDemoSession(session: DemoStoredSession): void {
  if (typeof window === "undefined") return

  window.localStorage.setItem(
    DEMO_SESSION_STORAGE_KEY,
    JSON.stringify({
      ...session,
      updated_at: new Date().toISOString(),
    }),
  )
}

export function clearDemoSession(): void {
  if (typeof window === "undefined") return

  window.localStorage.removeItem(DEMO_SESSION_STORAGE_KEY)
}
