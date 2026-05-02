"use server"

import { generateText, Output } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import type { Entry } from "@/lib/types"

export type ProcessResult =
  | {
      type: "drop_in"
      entry: Entry
      ack: string
    }
  | {
      type: "check_in"
      reflection: string
    }
  | {
      type: "error"
      message: string
    }

// Use OpenRouter API (OpenAI-compatible)
const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
})

// Using a fast, cheap model — you can change this to any OpenRouter model
const model = openrouter("openai/gpt-4o-mini")

export async function processMessage(text: string): Promise<ProcessResult> {
  const trimmed = text.trim()
  if (!trimmed) {
    return { type: "error", message: "say something." }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { type: "error", message: "not signed in." }
  }

  // Step 1 — classify the message and (if it's a drop-in) extract metadata.
  let classification: {
    intent: "drop_in" | "check_in"
    content: string
    project: string | null
    mood: string | null
    duration_minutes: number | null
  }

  try {
    const { output } = await generateText({
      model,
      output: Output.object({
        schema: z.object({
          intent: z
            .enum(["drop_in", "check_in"])
            .describe(
              "drop_in = user is logging something they did. check_in = user is in a guilt spiral, expressing frustration, self-doubt, or asking to be reminded of what they did."
            ),
          content: z
            .string()
            .describe(
              "If drop_in: a cleaned, slightly tidied version of what they did, in their voice. Lowercase, conversational, under 100 chars. If check_in: empty string."
            ),
          project: z
            .string()
            .nullable()
            .describe("Project or context if obvious (e.g. 'cinecircle', 'gallery'). Otherwise null."),
          mood: z
            .string()
            .nullable()
            .describe("One-word mood if expressed (e.g. 'tired', 'proud', 'frustrated'). Otherwise null."),
          duration_minutes: z
            .number()
            .nullable()
            .describe("Rough duration in minutes if mentioned (e.g. '2 hrs' = 120). Otherwise null."),
        }),
      }),
      prompt: [
        "Classify the user's message and (for drop_in) extract metadata.",
        "",
        "drop_in examples:",
        '  "spent like 2 hrs on socket bug" → drop_in',
        '  "had coffee with mark, talked about the gallery" → drop_in',
        '  "groceries" → drop_in',
        '  "ugh just finished that horrible email thing" → drop_in',
        "",
        "check_in examples:",
        '  "i feel like i did nothing today" → check_in',
        '  "im a fraud" → check_in',
        '  "why am i like this" → check_in',
        '  "what did i even do today" → check_in',
        "",
        `Message: "${trimmed}"`,
      ].join("\n"),
    })

    classification = output
  } catch (err) {
    console.log("[v0] classification error:", err)
    return { type: "error", message: "something went sideways. try again." }
  }

  if (classification.intent === "drop_in") {
    const insert = {
      user_id: user.id,
      content: classification.content || trimmed,
      project: classification.project,
      mood: classification.mood,
      duration_minutes: classification.duration_minutes,
    }

    const { data: entry, error: insertError } = await supabase
      .from("entries")
      .insert(insert)
      .select()
      .single()

    if (insertError || !entry) {
      console.log("[v0] insert error:", insertError)
      return { type: "error", message: "couldn't save that. try again." }
    }

    // Warm one-liner ack
    let ack = "on the record."
    try {
      const { text: ackText } = await generateText({
        model,
        prompt: [
          "You are Alibi: a warm friend who is quietly logging the user's day for them.",
          "They just told you something they did. Reply with ONE short acknowledgment.",
          "",
          "Rules:",
          "- 2 to 5 words, lowercase, no emojis",
          "- end with a period",
          "- sound like a calm friend, not a coach or bot",
          "- examples: \"on the record.\" / \"got it.\" / \"noted.\" / \"logged.\" / \"that counts.\" / \"adding it.\" / \"saved.\" / \"witnessed.\"",
          "- do NOT congratulate, do NOT use exclamation marks, do NOT say \"great job\" or similar",
          "- vary the phrasing, don't repeat",
          "",
          `What they did: "${insert.content}"`,
          "",
          "Reply with ONLY the phrase, nothing else.",
        ].join("\n"),
      })
      const cleaned = ackText.trim().replace(/^["']|["']$/g, "").toLowerCase()
      if (cleaned && cleaned.length <= 40) {
        ack = cleaned
      }
    } catch (err) {
      console.log("[v0] ack error:", err)
    }

    return { type: "drop_in", entry: entry as Entry, ack }
  }

  // check_in — pull today's entries and reflect them back warmly.
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const { data: todayEntries } = await supabase
    .from("entries")
    .select("*")
    .gte("created_at", startOfDay.toISOString())
    .order("created_at", { ascending: true })

  const entriesText =
    (todayEntries ?? [])
      .map((e: Entry) => {
        const bits: string[] = [`- ${e.content}`]
        if (e.project) bits.push(`(project: ${e.project})`)
        if (e.duration_minutes) bits.push(`(~${e.duration_minutes} min)`)
        if (e.mood) bits.push(`(mood: ${e.mood})`)
        return bits.join(" ")
      })
      .join("\n") || "(no entries logged today yet)"

  let reflection =
    "i don't have anything on the record yet today, but the day isn't over. log one small thing — the smallest counts."

  try {
    const { text } = await generateText({
      model,
      system: [
        "You are Alibi: the friend who remembers the user's day so they don't have to defend it to themselves.",
        "The user is in a guilt spiral — they feel they did nothing, or they're being hard on themselves.",
        "Your job: read their day back to them, with warmth, using ONLY their actual logged entries as evidence.",
        "",
        "Hard rules:",
        "- speak in lowercase, conversational, like a calm friend texting",
        "- be specific — quote their actual entries, project names, durations",
        "- do not perform positivity, do not exclaim, do not use emojis",
        "- do not suggest techniques (no breathing, no journaling, no \"try to\")",
        "- do not lecture about productivity or self-care",
        "- if they have entries, list them in plain language (e.g. \"today you...\")",
        "- if they have NO entries today, gently say so without judgment, and remind them the day isn't over",
        "- end with ONE short kind line (e.g. \"be nice to yourself.\" / \"that's a real day.\" / \"that counts.\")",
        "- under 80 words total",
      ].join("\n"),
      prompt: [
        `The user said: "${trimmed}"`,
        "",
        "Today's entries:",
        entriesText,
      ].join("\n"),
    })
    if (text.trim()) reflection = text.trim()
  } catch (err) {
    console.log("[v0] reflection error:", err)
  }

  return { type: "check_in", reflection }
}
