export interface Entry {
  id: string
  user_id: string
  content: string
  project: string | null
  mood: string | null
  duration_minutes: number | null
  created_at: string
}

export type ProactiveKind = "insight" | "nudge" | "celebration" | "pattern"

export interface ProactiveMessage {
  id: string
  user_id: string
  content: string
  kind: ProactiveKind
  entries_count_at_creation: number
  created_at: string
  read_at: string | null
}
