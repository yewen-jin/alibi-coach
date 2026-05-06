export const DEMO_AI_TOKEN_LIMIT = 50_000
export const DEMO_COMPANION_MIN_TOKENS = 1_500
export const DEMO_INSIGHT_MIN_TOKENS = 900

export interface DemoAiUsage {
  tokens_used: number
  token_limit: number
  updated_at: string
}

export function createDemoAiUsage(): DemoAiUsage {
  return {
    tokens_used: 0,
    token_limit: DEMO_AI_TOKEN_LIMIT,
    updated_at: new Date().toISOString(),
  }
}

export function estimateTokensFromText(text: string) {
  return Math.ceil(text.length / 4)
}

export function estimateTokensFromValue(value: unknown) {
  return estimateTokensFromText(JSON.stringify(value))
}

export function remainingDemoTokens(usage: DemoAiUsage) {
  return Math.max(0, usage.token_limit - usage.tokens_used)
}

export function canSpendDemoTokens(usage: DemoAiUsage, minimum: number) {
  return remainingDemoTokens(usage) >= minimum
}

export function addDemoTokenUsage(usage: DemoAiUsage, tokens: number): DemoAiUsage {
  return {
    ...usage,
    tokens_used: Math.min(usage.token_limit, usage.tokens_used + Math.max(0, Math.ceil(tokens))),
    updated_at: new Date().toISOString(),
  }
}
