import { createOpenAICompatible } from "@ai-sdk/openai-compatible"

// OpenRouter (OpenAI-compatible) provider, shared across agents.
const openrouter = createOpenAICompatible({
  name: "openrouter",
  baseURL: "https://openrouter.ai/api/v1",
  headers: {
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
  },
})

// Default working model for all agents.
export const aiModel = openrouter("openai/gpt-4o-mini")

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
