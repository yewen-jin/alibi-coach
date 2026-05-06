import { describe, expect, it } from "vitest"
import { deriveChatInsightFromMessage } from "@/lib/chat-insights"

describe("deriveChatInsightFromMessage", () => {
  it("returns null for empty messages", () => {
    expect(deriveChatInsightFromMessage(null)).toBeNull()
    expect(deriveChatInsightFromMessage("")).toBeNull()
    expect(deriveChatInsightFromMessage("   ")).toBeNull()
  })

  it("extracts intended action from meant-to language", () => {
    const result = deriveChatInsightFromMessage("i meant to work on the proposal but got stuck")
    expect(result?.intended_actions[0]).toContain("meant to work on the proposal")
    expect(result?.themes).toContain("intention")
  })

  it("extracts useful drift from a sidetrack with value", () => {
    const result = deriveChatInsightFromMessage("got distracted but fixed the gallery upload bug")
    expect(result?.useful_drift[0]).toContain("got distracted but fixed")
    expect(result?.themes).toContain("useful drift")
  })

  it("extracts guilt and mismatch from did-nothing language with a correction", () => {
    const result = deriveChatInsightFromMessage("felt like i did nothing but actually fixed the receipt mess")
    expect(result?.mismatch_signals.length).toBeGreaterThan(0)
    expect(result?.emotional_signals.length).toBeGreaterThan(0)
    expect(result?.themes).toContain("mismatch")
  })

  it("does not create missing-work claims without stated intent", () => {
    const result = deriveChatInsightFromMessage("i felt scattered after lunch")
    expect(result?.intended_actions).toHaveLength(0)
    expect(result?.avoided_or_deferred).toHaveLength(0)
    expect(result?.mismatch_signals).toHaveLength(0)
  })
})
