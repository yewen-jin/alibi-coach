import { describe, expect, it } from "vitest"
import {
  aggregateByCategory,
  aggregateByHour,
  aggregateByWeekday,
  bucketByDay,
} from "@/lib/dashboard-data"
import type { TimeBlock } from "@/lib/types"

function makeBlock(overrides: Partial<TimeBlock> = {}): TimeBlock {
  return {
    id: "test-id",
    user_id: "user-1",
    task_name: "test task",
    category: "deep_work",
    hashtags: [],
    notes: null,
    started_at: "2026-05-05T10:00:00.000Z",
    ended_at: "2026-05-05T11:00:00.000Z",
    duration_seconds: 3600,
    mood: null,
    effort_level: null,
    satisfaction: null,
    avoidance_marker: false,
    hyperfocus_marker: false,
    guilt_marker: false,
    novelty_marker: false,
    created_at: "2026-05-05T10:00:00.000Z",
    updated_at: "2026-05-05T10:00:00.000Z",
    note_version_id: null,
    ...overrides,
  }
}

describe("bucketByDay", () => {
  it("groups blocks by calendar date key", () => {
    const blocks = [
      makeBlock({ started_at: "2026-05-05T10:00:00.000Z" }),
      makeBlock({ started_at: "2026-05-05T14:00:00.000Z" }),
      makeBlock({ started_at: "2026-05-06T09:00:00.000Z" }),
    ]
    const result = bucketByDay(blocks)
    expect(result.size).toBe(2)
    expect(result.get("2026-05-05")?.count).toBe(2)
    expect(result.get("2026-05-06")?.count).toBe(1)
  })

  it("sums minutes correctly from duration_seconds", () => {
    const blocks = [
      makeBlock({ duration_seconds: 3600 }),
      makeBlock({ duration_seconds: 1800 }),
    ]
    const result = bucketByDay(blocks)
    const bucket = result.get("2026-05-05")
    expect(bucket?.totalMinutes).toBe(90)
  })

  it("returns an empty map for no blocks", () => {
    expect(bucketByDay([])).toHaveProperty("size", 0)
  })
})

describe("aggregateByCategory", () => {
  it("groups and sorts by total minutes descending", () => {
    const blocks = [
      makeBlock({ category: "admin", duration_seconds: 1800 }),
      makeBlock({ category: "deep_work", duration_seconds: 7200 }),
      makeBlock({ category: "admin", duration_seconds: 1800 }),
    ]
    const result = aggregateByCategory(blocks)
    expect(result[0].category).toBe("deep work")
    expect(result[1].category).toBe("admin")
    expect(result[1].count).toBe(2)
    expect(result[1].totalMinutes).toBe(60)
  })

  it("labels blocks with no category as uncategorized", () => {
    const block = makeBlock({ category: null })
    const result = aggregateByCategory([block])
    expect(result[0].category).toBe("uncategorized")
  })
})

describe("aggregateByWeekday", () => {
  it("returns 7 entries one per weekday", () => {
    const result = aggregateByWeekday([])
    expect(result).toHaveLength(7)
  })

  it("increments the correct weekday slot", () => {
    // 2026-05-05 is a Tuesday (weekday 2)
    const block = makeBlock({ started_at: "2026-05-05T10:00:00.000Z" })
    const result = aggregateByWeekday([block])
    expect(result[2].count).toBe(1)
    expect(result[2].label).toBe("tue")
  })
})

describe("aggregateByHour", () => {
  it("returns 24 entries one per hour", () => {
    const result = aggregateByHour([])
    expect(result).toHaveLength(24)
  })

  it("increments the correct hour slot from started_at", () => {
    const started_at = "2026-05-05T14:30:00.000Z"
    const block = makeBlock({ started_at })
    const result = aggregateByHour([block])
    // getHours() reads local time; derive expected slot the same way
    const expectedHour = new Date(started_at).getHours()
    expect(result[expectedHour].count).toBe(1)
  })
})
