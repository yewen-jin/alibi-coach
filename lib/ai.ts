import { createOpenAICompatible } from "@ai-sdk/openai-compatible"

// OpenRouter (OpenAI-compatible) provider, shared across agents.
const openrouter = createOpenAICompatible({
  name: "openrouter",
  baseURL: "https://openrouter.ai/api/v1",
  headers: {
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
  },
})

// Cheap, low-latency model for routing, extraction, and terse acknowledgments.
export const fastModel = openrouter("openai/gpt-4.1-nano")

// Stronger model for user-visible coaching, reflection, and emotional nuance.
export const coachModel = openrouter("openai/gpt-5-mini")

/** Extract the first JSON object from a model response. */
export function extractJSON(text: string): Record<string, unknown> | null {
  try {
    return JSON.parse(text.trim())
  } catch {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (fenced) {
      try {
        return JSON.parse(fenced[1].trim())
      } catch {
        // fall through
      }
    }
    const obj = text.match(/\{[\s\S]*\}/)
    if (obj) {
      try {
        return JSON.parse(obj[0])
      } catch {
        return null
      }
    }
    return null
  }
}
