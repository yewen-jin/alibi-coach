import type {
  CompanionMessageInsight,
  TimeBlock,
  TimeBlockCategory,
} from "@/lib/types"

export interface DayBucket {
  date: string // YYYY-MM-DD in user's local time
  count: number
  totalMinutes: number
  blocks: TimeBlock[]
}

export interface CategoryStat {
  category: string
  count: number
  totalMinutes: number
}

export interface WeekdayStat {
  weekday: number // 0 = Sunday
  label: string
  count: number
  totalMinutes: number
}

export interface HourStat {
  hour: number // 0–23
  count: number
}

export interface ChatMirrorObservation {
  title: string
  body: string
  evidence: string
}

const WEEKDAY_LABELS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]

export function localDateKey(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function durationMinutes(block: TimeBlock): number {
  if (typeof block.duration_seconds === "number") {
    return Math.round(block.duration_seconds / 60)
  }

  if (!block.ended_at) {
    return 0
  }

  const startedAt = new Date(block.started_at).getTime()
  const endedAt = new Date(block.ended_at).getTime()

  if (Number.isNaN(startedAt) || Number.isNaN(endedAt) || endedAt <= startedAt) {
    return 0
  }

  return Math.round((endedAt - startedAt) / 60_000)
}

export interface DailyTimelineItem {
  block: TimeBlock
  startMinutes: number
  durationMinutes: number
  topPercent: number
  heightPercent: number
}

function categoryLabel(category: TimeBlockCategory | null): string {
  return category?.replace("_", " ") ?? "uncategorized"
}

/** Bucket time blocks by local calendar day. */
export function bucketByDay(blocks: TimeBlock[]): Map<string, DayBucket> {
  const map = new Map<string, DayBucket>()
  for (const block of blocks) {
    const key = localDateKey(block.started_at)
    const bucket = map.get(key) ?? {
      date: key,
      count: 0,
      totalMinutes: 0,
      blocks: [],
    }
    bucket.count += 1
    bucket.totalMinutes += durationMinutes(block)
    bucket.blocks.push(block)
    map.set(key, bucket)
  }
  return map
}

export function blocksForLocalDate(blocks: TimeBlock[], dateKey: string): TimeBlock[] {
  return blocks
    .filter((block) => localDateKey(block.started_at) === dateKey)
    .slice()
    .sort(
      (a, b) =>
        new Date(a.started_at).getTime() - new Date(b.started_at).getTime(),
    )
}

export function buildDailyTimelineItems(blocks: TimeBlock[]): DailyTimelineItem[] {
  return blocks
    .map((block) => {
      const startedAt = new Date(block.started_at)
      const startedMs = startedAt.getTime()

      if (Number.isNaN(startedMs)) {
        return null
      }

      let duration = durationMinutes(block)

      if (!duration && block.ended_at) {
        const endedMs = new Date(block.ended_at).getTime()
        if (!Number.isNaN(endedMs) && endedMs > startedMs) {
          duration = Math.max(1, Math.round((endedMs - startedMs) / 60_000))
        }
      }

      if (duration <= 0) {
        return null
      }

      const startMinutes = startedAt.getHours() * 60 + startedAt.getMinutes()
      const dayMinutes = 24 * 60
      const clampedDuration = Math.min(duration, dayMinutes - startMinutes)

      if (clampedDuration <= 0) {
        return null
      }

      return {
        block,
        startMinutes,
        durationMinutes: clampedDuration,
        topPercent: (startMinutes / dayMinutes) * 100,
        heightPercent: (clampedDuration / dayMinutes) * 100,
      }
    })
    .filter((item): item is DailyTimelineItem => item !== null)
    .sort((a, b) => a.startMinutes - b.startMinutes)
}

/** Aggregate by category (blocks without category go under "uncategorized"). */
export function aggregateByCategory(blocks: TimeBlock[]): CategoryStat[] {
  const map = new Map<string, CategoryStat>()
  for (const block of blocks) {
    const key = categoryLabel(block.category)
    const stat = map.get(key) ?? { category: key, count: 0, totalMinutes: 0 }
    stat.count += 1
    stat.totalMinutes += durationMinutes(block)
    map.set(key, stat)
  }
  return Array.from(map.values()).sort((a, b) => b.totalMinutes - a.totalMinutes)
}

/** Aggregate by day-of-week to surface weekly rhythm. */
export function aggregateByWeekday(blocks: TimeBlock[]): WeekdayStat[] {
  const stats: WeekdayStat[] = WEEKDAY_LABELS.map((label, weekday) => ({
    weekday,
    label,
    count: 0,
    totalMinutes: 0,
  }))
  for (const block of blocks) {
    const wd = new Date(block.started_at).getDay()
    stats[wd].count += 1
    stats[wd].totalMinutes += durationMinutes(block)
  }
  return stats
}

/** Aggregate by hour to surface time-of-day patterns. */
export function aggregateByHour(blocks: TimeBlock[]): HourStat[] {
  const stats: HourStat[] = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: 0,
  }))
  for (const block of blocks) {
    const h = new Date(block.started_at).getHours()
    stats[h].count += 1
  }
  return stats
}

/** Build the grid of days for a given month, including leading/trailing blanks. */
export interface CalendarCell {
  dateKey: string | null // null = blank cell from prev/next month
  day: number | null
  bucket: DayBucket | null
  isToday: boolean
}

export function buildCalendarGrid(
  year: number,
  month: number, // 0-indexed
  buckets: Map<string, DayBucket>
): CalendarCell[] {
  const firstOfMonth = new Date(year, month, 1)
  const startWeekday = firstOfMonth.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayKey = localDateKey(new Date().toISOString())

  const cells: CalendarCell[] = []
  // Leading blanks
  for (let i = 0; i < startWeekday; i++) {
    cells.push({ dateKey: null, day: null, bucket: null, isToday: false })
  }
  // Days of month
  for (let day = 1; day <= daysInMonth; day++) {
    const m = String(month + 1).padStart(2, "0")
    const d = String(day).padStart(2, "0")
    const dateKey = `${year}-${m}-${d}`
    cells.push({
      dateKey,
      day,
      bucket: buckets.get(dateKey) ?? null,
      isToday: dateKey === todayKey,
    })
  }
  // Trailing blanks to complete the last row
  while (cells.length % 7 !== 0) {
    cells.push({ dateKey: null, day: null, bucket: null, isToday: false })
  }
  return cells
}

export function totalsFor(blocks: TimeBlock[]) {
  const distinctDays = new Set<string>()
  let totalMinutes = 0
  for (const block of blocks) {
    distinctDays.add(localDateKey(block.started_at))
    totalMinutes += durationMinutes(block)
  }
  return {
    totalBlocks: blocks.length,
    distinctDays: distinctDays.size,
    totalMinutes,
  }
}

function insightExcerpt(value: string | null) {
  if (!value) return "no excerpt"
  return value.length > 140 ? `${value.slice(0, 137)}...` : value
}

function blockLabel(block: TimeBlock) {
  const date = new Date(block.started_at).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  })
  return `${date}, ${block.task_name ?? "unnamed block"}`
}

function chatEvidenceLabel(insight: CompanionMessageInsight, blocksById: Map<string, TimeBlock>) {
  if (insight.related_time_block_id) {
    const block = blocksById.get(insight.related_time_block_id)
    return block ? `chat about ${blockLabel(block)}` : "block-linked chat"
  }

  return "general chat"
}

export function buildChatMirrorObservations(
  insights: CompanionMessageInsight[],
  blocks: TimeBlock[] = [],
): ChatMirrorObservation[] {
  const blocksById = new Map(blocks.map((block) => [block.id, block]))
  const observations: ChatMirrorObservation[] = []
  const withEvidence = insights.filter((insight) => insight.evidence_excerpt?.trim())
  const mismatch = withEvidence.filter(
    (insight) => insight.mismatch_signals.length > 0 || insight.themes.includes("mismatch"),
  )
  const intention = withEvidence.filter(
    (insight) => insight.intended_actions.length > 0 || insight.avoided_or_deferred.length > 0,
  )
  const drift = withEvidence.filter(
    (insight) => insight.useful_drift.length > 0 || insight.themes.includes("useful drift"),
  )
  const friction = withEvidence.filter(
    (insight) => insight.friction_points.length > 0 || insight.avoided_or_deferred.length > 0,
  )
  const emotion = withEvidence.filter((insight) => insight.emotional_signals.length > 0)

  const firstMismatch = mismatch[0]
  if (firstMismatch) {
    observations.push({
      title: "what counted but didn't feel counted",
      body: `${mismatch.length} chat message${mismatch.length === 1 ? "" : "s"} mention a gap between what happened and what felt real.`,
      evidence: `${chatEvidenceLabel(firstMismatch, blocksById)}: ${insightExcerpt(firstMismatch.evidence_excerpt)}`,
    })
  }

  const firstIntention = intention[0]
  if (firstIntention) {
    observations.push({
      title: "intended versus actual",
      body: `${intention.length} chat message${intention.length === 1 ? "" : "s"} name an intention, deferral, or avoided task explicitly.`,
      evidence: `${chatEvidenceLabel(firstIntention, blocksById)}: ${insightExcerpt(firstIntention.evidence_excerpt)}`,
    })
  }

  const firstDrift = drift[0]
  if (firstDrift) {
    observations.push({
      title: "useful drift",
      body: `${drift.length} chat message${drift.length === 1 ? "" : "s"} describe a sidetrack that still produced something useful.`,
      evidence: `${chatEvidenceLabel(firstDrift, blocksById)}: ${insightExcerpt(firstDrift.evidence_excerpt)}`,
    })
  }

  const firstFriction = friction.find((insight) => !observations.some((item) => item.evidence.includes(insightExcerpt(insight.evidence_excerpt))))
  if (firstFriction) {
    observations.push({
      title: "recurring friction language",
      body: `${friction.length} chat message${friction.length === 1 ? "" : "s"} use friction, avoidance, or stuck language.`,
      evidence: `${chatEvidenceLabel(firstFriction, blocksById)}: ${insightExcerpt(firstFriction.evidence_excerpt)}`,
    })
  }

  const firstEmotion = emotion.find((insight) => !observations.some((item) => item.evidence.includes(insightExcerpt(insight.evidence_excerpt))))
  if (firstEmotion) {
    observations.push({
      title: "emotional weather",
      body: `${emotion.length} chat message${emotion.length === 1 ? "" : "s"} carry explicit feeling language.`,
      evidence: `${chatEvidenceLabel(firstEmotion, blocksById)}: ${insightExcerpt(firstEmotion.evidence_excerpt)}`,
    })
  }

  return observations.slice(0, 4)
}

/* ─────────────────── ADHD Marker Stats ─────────────────── */

export interface MarkerStat {
  label: string
  key: "avoidance" | "hyperfocus" | "guilt" | "novelty"
  count: number
  pct: number
  description: string
}

export function aggregateMarkers(blocks: TimeBlock[]): MarkerStat[] {
  const total = blocks.length
  if (total === 0) {
    return [
      { label: "avoidance conquered", key: "avoidance", count: 0, pct: 0, description: "tasks you were putting off" },
      { label: "hyperfocus sessions", key: "hyperfocus", count: 0, pct: 0, description: "deep flow states" },
      { label: "guilt moments", key: "guilt", count: 0, pct: 0, description: "self-critical entries" },
      { label: "novelty seeking", key: "novelty", count: 0, pct: 0, description: "trying new things" },
    ]
  }

  const avoidance = blocks.filter((block) => block.avoidance_marker).length
  const hyperfocus = blocks.filter((block) => block.hyperfocus_marker).length
  const guilt = blocks.filter((block) => block.guilt_marker).length
  const novelty = blocks.filter((block) => block.novelty_marker).length

  return [
    { label: "avoidance conquered", key: "avoidance", count: avoidance, pct: Math.round((avoidance / total) * 100), description: "tasks you were putting off" },
    { label: "hyperfocus sessions", key: "hyperfocus", count: hyperfocus, pct: Math.round((hyperfocus / total) * 100), description: "deep flow states" },
    { label: "guilt moments", key: "guilt", count: guilt, pct: Math.round((guilt / total) * 100), description: "self-critical entries" },
    { label: "novelty seeking", key: "novelty", count: novelty, pct: Math.round((novelty / total) * 100), description: "trying new things" },
  ]
}

export interface EffortStat {
  level: string
  count: number
  pct: number
}

export function aggregateEffort(blocks: TimeBlock[]): EffortStat[] {
  const levels = ["easy", "medium", "hard", "grind"] as const
  const total = blocks.filter((block) => block.effort_level).length
  if (total === 0) {
    return levels.map((level) => ({ level, count: 0, pct: 0 }))
  }
  return levels.map((level) => {
    const count = blocks.filter((block) => block.effort_level === level).length
    return { level, count, pct: Math.round((count / total) * 100) }
  })
}

export interface SatisfactionStat {
  level: string
  count: number
  pct: number
}

export function aggregateSatisfaction(blocks: TimeBlock[]): SatisfactionStat[] {
  const levels = ["satisfied", "mixed", "frustrated", "unclear"] as const
  const total = blocks.filter((block) => block.satisfaction).length
  if (total === 0) {
    return levels.map((level) => ({ level, count: 0, pct: 0 }))
  }
  return levels.map((level) => {
    const count = blocks.filter((block) => block.satisfaction === level).length
    return { level, count, pct: Math.round((count / total) * 100) }
  })
}
