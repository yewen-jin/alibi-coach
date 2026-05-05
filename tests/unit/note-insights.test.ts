import { describe, expect, it } from "vitest"
import { deriveInsightFromNotes } from "@/lib/note-insights"

describe("deriveInsightFromNotes", () => {
  it("returns null for empty notes", () => {
    expect(deriveInsightFromNotes(null)).toBeNull()
    expect(deriveInsightFromNotes("")).toBeNull()
    expect(deriveInsightFromNotes("   ")).toBeNull()
  })

  it("detects friction signals", () => {
    const result = deriveInsightFromNotes("kept getting distracted, couldn't focus")
    expect(result?.friction_points.length).toBeGreaterThan(0)
    expect(result?.themes).toContain("friction")
  })

  it("detects avoidance signals", () => {
    const result = deriveInsightFromNotes("procrastinated on this for an hour")
    expect(result?.avoidance_signals.length).toBeGreaterThan(0)
    expect(result?.themes).toContain("avoidance")
  })

  it("detects hyperfocus signals", () => {
    const result = deriveInsightFromNotes("lost track of time, couldn't stop coding")
    expect(result?.hyperfocus_signals.length).toBeGreaterThan(0)
    expect(result?.themes).toContain("hyperfocus")
  })

  it("detects satisfaction signals", () => {
    const result = deriveInsightFromNotes("really proud of what I got done today")
    expect(result?.satisfaction_signals.length).toBeGreaterThan(0)
    expect(result?.themes).toContain("satisfaction")
  })

  it("infers anxious tone", () => {
    const result = deriveInsightFromNotes("feeling overwhelmed and stressed about the deadline")
    expect(result?.emotional_tone).toBe("anxious")
  })

  it("infers positive tone", () => {
    const result = deriveInsightFromNotes("glad this is done, feeling satisfied")
    expect(result?.emotional_tone).toBe("positive")
  })

  it("infers self-critical tone", () => {
    const result = deriveInsightFromNotes("should have started earlier, wasted the morning")
    expect(result?.emotional_tone).toBe("self-critical")
  })

  it("extracts action phrases", () => {
    const result = deriveInsightFromNotes("worked on the landing page copy and fixed the nav bug")
    expect(result?.actions.length).toBeGreaterThan(0)
  })

  it("truncates long notes for evidence_excerpt", () => {
    const long = "x".repeat(200)
    const result = deriveInsightFromNotes(long)
    expect(result?.evidence_excerpt.length).toBeLessThanOrEqual(180)
    expect(result?.evidence_excerpt.endsWith("...")).toBe(true)
  })

  it("returns no themes for neutral plain notes", () => {
    const result = deriveInsightFromNotes("reviewed the spec document")
    expect(result?.themes).toHaveLength(0)
  })

  it("does not duplicate theme labels", () => {
    const result = deriveInsightFromNotes("stuck and blocked and distracted")
    const unique = new Set(result?.themes)
    expect(unique.size).toBe(result?.themes.length)
  })
})
