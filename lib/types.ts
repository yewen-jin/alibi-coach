export interface Entry {
  id: string
  user_id: string
  content: string
  project: string | null
  mood: string | null
  duration_minutes: number | null
  created_at: string
}

export interface CoachResponse {
  message: string
  type: "encouragement" | "reframe" | "celebration"
}
