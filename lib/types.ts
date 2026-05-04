export type Mood = "joyful" | "neutral" | "flat" | "anxious" | "guilty" | "proud"
export type EffortLevel = "easy" | "medium" | "hard" | "grind"
export type Satisfaction = "satisfied" | "mixed" | "frustrated" | "unclear"
export type TimeBlockCategory =
  | "deep_work"
  | "admin"
  | "social"
  | "errands"
  | "care"
  | "creative"
  | "rest"

export interface Entry {
  id: string
  user_id: string
  raw_input: string | null
  content: string
  project: string | null
  mood: Mood | null
  duration_minutes: number | null
  effort_level: EffortLevel | null
  satisfaction: Satisfaction | null
  avoidance_marker: boolean
  hyperfocus_marker: boolean
  guilt_marker: boolean
  novelty_marker: boolean
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

export interface ActiveTimer {
  user_id: string
  started_at: string
  created_at: string
}

export interface TimeBlock {
  id: string
  user_id: string
  started_at: string
  ended_at: string | null
  duration_seconds: number | null
  task_name: string | null
  category: TimeBlockCategory | null
  hashtags: string[] | null
  notes: string | null
  mood: Mood | null
  effort_level: EffortLevel | null
  satisfaction: Satisfaction | null
  avoidance_marker: boolean
  hyperfocus_marker: boolean
  guilt_marker: boolean
  novelty_marker: boolean
  created_at: string
  updated_at: string
}

export interface SaveBlockInput {
  id?: string
  task_name: string
  category: TimeBlockCategory
  started_at: string
  ended_at: string
  hashtags?: string[]
  notes?: string | null
}

export interface DeleteBlockInput {
  id: string
}

export type StartTimerResult =
  | {
      type: "started"
      activeTimer: ActiveTimer
    }
  | {
      type: "already_running"
      activeTimer: ActiveTimer
    }
  | {
      type: "error"
      message: string
    }

export type StopTimerResult =
  | {
      type: "stopped"
      timeBlock: TimeBlock
    }
  | {
      type: "not_running"
    }
  | {
      type: "error"
      message: string
      timeBlock?: TimeBlock
    }

export type SaveBlockResult =
  | {
      type: "saved"
      timeBlock: TimeBlock
    }
  | {
      type: "not_found"
    }
  | {
      type: "error"
      message: string
    }

export type DeleteBlockResult =
  | {
      type: "deleted"
      id: string
    }
  | {
      type: "not_found"
    }
  | {
      type: "error"
      message: string
    }
