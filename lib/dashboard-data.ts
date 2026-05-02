import type { Entry } from "@/lib/types"

export interface DayBucket {
  date: string // YYYY-MM-DD in user's local time
  count: number
  totalMinutes: number
  entries: Entry[]
}

export interface ProjectStat {
  project: string
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

const WEEKDAY_LABELS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]

function localDateKey(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/** Bucket entries by local calendar day. */
export function bucketByDay(entries: Entry[]): Map<string, DayBucket> {
  const map = new Map<string, DayBucket>()
  for (const entry of entries) {
    const key = localDateKey(entry.created_at)
    const bucket = map.get(key) ?? {
      date: key,
      count: 0,
      totalMinutes: 0,
      entries: [],
    }
    bucket.count += 1
    bucket.totalMinutes += entry.duration_minutes ?? 0
    bucket.entries.push(entry)
    map.set(key, bucket)
  }
  return map
}

/** Aggregate by project (entries without project go under "untagged"). */
export function aggregateByProject(entries: Entry[]): ProjectStat[] {
  const map = new Map<string, ProjectStat>()
  for (const entry of entries) {
    const key = entry.project?.trim().toLowerCase() || "untagged"
    const stat = map.get(key) ?? { project: key, count: 0, totalMinutes: 0 }
    stat.count += 1
    stat.totalMinutes += entry.duration_minutes ?? 0
    map.set(key, stat)
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count)
}

/** Aggregate by day-of-week to surface weekly rhythm. */
export function aggregateByWeekday(entries: Entry[]): WeekdayStat[] {
  const stats: WeekdayStat[] = WEEKDAY_LABELS.map((label, weekday) => ({
    weekday,
    label,
    count: 0,
    totalMinutes: 0,
  }))
  for (const entry of entries) {
    const wd = new Date(entry.created_at).getDay()
    stats[wd].count += 1
    stats[wd].totalMinutes += entry.duration_minutes ?? 0
  }
  return stats
}

/** Aggregate by hour to surface time-of-day patterns. */
export function aggregateByHour(entries: Entry[]): HourStat[] {
  const stats: HourStat[] = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: 0,
  }))
  for (const entry of entries) {
    const h = new Date(entry.created_at).getHours()
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

export function totalsFor(entries: Entry[]) {
  const distinctDays = new Set<string>()
  let totalMinutes = 0
  for (const entry of entries) {
    distinctDays.add(localDateKey(entry.created_at))
    totalMinutes += entry.duration_minutes ?? 0
  }
  return {
    totalEntries: entries.length,
    distinctDays: distinctDays.size,
    totalMinutes,
  }
}

/* ─────────────────── ADHD Marker Stats ─────────────────── */

export interface MarkerStat {
  label: string
  key: "avoidance" | "hyperfocus" | "guilt" | "novelty"
  count: number
  pct: number
  description: string
}

export function aggregateMarkers(entries: Entry[]): MarkerStat[] {
  const total = entries.length
  if (total === 0) {
    return [
      { label: "avoidance conquered", key: "avoidance", count: 0, pct: 0, description: "tasks you were putting off" },
      { label: "hyperfocus sessions", key: "hyperfocus", count: 0, pct: 0, description: "deep flow states" },
      { label: "guilt moments", key: "guilt", count: 0, pct: 0, description: "self-critical entries" },
      { label: "novelty seeking", key: "novelty", count: 0, pct: 0, description: "trying new things" },
    ]
  }

  const avoidance = entries.filter((e) => e.avoidance_marker).length
  const hyperfocus = entries.filter((e) => e.hyperfocus_marker).length
  const guilt = entries.filter((e) => e.guilt_marker).length
  const novelty = entries.filter((e) => e.novelty_marker).length

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

export function aggregateEffort(entries: Entry[]): EffortStat[] {
  const levels = ["easy", "medium", "hard", "grind"] as const
  const total = entries.filter((e) => e.effort_level).length
  if (total === 0) {
    return levels.map((level) => ({ level, count: 0, pct: 0 }))
  }
  return levels.map((level) => {
    const count = entries.filter((e) => e.effort_level === level).length
    return { level, count, pct: Math.round((count / total) * 100) }
  })
}

export interface SatisfactionStat {
  level: string
  count: number
  pct: number
}

export function aggregateSatisfaction(entries: Entry[]): SatisfactionStat[] {
  const levels = ["satisfied", "mixed", "frustrated", "unclear"] as const
  const total = entries.filter((e) => e.satisfaction).length
  if (total === 0) {
    return levels.map((level) => ({ level, count: 0, pct: 0 }))
  }
  return levels.map((level) => {
    const count = entries.filter((e) => e.satisfaction === level).length
    return { level, count, pct: Math.round((count / total) * 100) }
  })
}
