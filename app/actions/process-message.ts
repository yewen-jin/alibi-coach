"use server"

import { generateText } from "ai"
import { aiModel, extractJSON } from "@/lib/ai"
import { createClient } from "@/lib/supabase/server"
import { maybeGenerateProactiveMessage } from "./generate-insight"
import type { Entry, ProactiveMessage } from "@/lib/types"

export type ProcessResult =
  | {
      type: "drop_in"
      entry: Entry
      ack: string
      proactive: ProactiveMessage | null
    }
  | {
      type: "check_in"
      reflection: string
    }
  | {
      type: "error"
      message: string
    }

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
    const { text: classificationText } = await generateText({
      model: aiModel,
      prompt: [
        "Classify the user's message and extract metadata. Reply ONLY with a JSON object, no other text.",
        "",
        "Schema:",
        "{",
        '  "intent": "drop_in" | "check_in",',
        '  "content": "string (cleaned version of what they did, or empty if check_in)",',
        '  "project": "string | null (project name if obvious)",',
        '  "mood": "string | null (one-word mood if expressed)",',
        '  "duration_minutes": "number | null (duration in minutes if mentioned)"',
        "}",
        "",
        "intent meanings:",
        "- drop_in = user is logging something they did",
        "- check_in = user is in a guilt spiral, expressing frustration, self-doubt, or asking what they did",
        "",
        "drop_in examples:",
        '  "spent like 2 hrs on socket bug" → {"intent":"drop_in","content":"spent 2 hours on socket bug","project":null,"mood":null,"duration_minutes":120}',
        '  "had coffee with mark, talked about the gallery" → {"intent":"drop_in","content":"had coffee with mark, talked about the gallery","project":"gallery","mood":null,"duration_minutes":null}',
        '  "groceries" → {"intent":"drop_in","content":"groceries","project":null,"mood":null,"duration_minutes":null}',
        "",
        "check_in examples:",
        '  "i feel like i did nothing today" → {"intent":"check_in","content":"","project":null,"mood":null,"duration_minutes":null}',
        '  "im a fraud" → {"intent":"check_in","content":"","project":null,"mood":null,"duration_minutes":null}',
        '  "what did i even do today" → {"intent":"check_in","content":"","project":null,"mood":null,"duration_minutes":null}',
        "",
        `User message: "${trimmed}"`,
        "",
        "Reply with ONLY the JSON object:",
      ].join("\n"),
    })

    const parsed = extractJSON(classificationText)
    if (!parsed || !parsed.intent) {
      classification = {
        intent: "drop_in",
        content: trimmed,
        project: null,
        mood: null,
        duration_minutes: null,
      }
    } else {
      classification = {
        intent: parsed.intent === "check_in" ? "check_in" : "drop_in",
        content: typeof parsed.content === "string" ? parsed.content : trimmed,
        project: typeof parsed.project === "string" ? parsed.project : null,
        mood: typeof parsed.mood === "string" ? parsed.mood : null,
        duration_minutes:
          typeof parsed.duration_minutes === "number"
            ? parsed.duration_minutes
            : null,
      }
    }
  } catch {
    classification = {
      intent: "drop_in",
      content: trimmed,
      project: null,
      mood: null,
      duration_minutes: null,
    }
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
      return { type: "error", message: "couldn't save that. try again." }
    }

    let ack = "on the record."
    try {
      const { text: ackText } = await generateText({
        model: aiModel,
        prompt: [
          "You are Alibi: a warm friend who is quietly logging the user's day for them.",
          "They just told you something they did. Reply with ONE short acknowledgment.",
          "",
          "Rules:",
          "- 2 to 5 words, lowercase, no emojis",
          "- end with a period",
          "- sound like a calm friend, not a coach or bot",
          '- examples: "on the record." / "got it." / "noted." / "logged." / "that counts." / "adding it." / "saved." / "witnessed."',
          '- do NOT congratulate, do NOT use exclamation marks, do NOT say "great job" or similar',
          "- vary the phrasing, don't repeat",
          "",
          `What they did: "${insert.content}"`,
          "",
          "Reply with ONLY the phrase, nothing else.",
        ].join("\n"),
      })
      const cleaned = ackText
        .trim()
        .replace(/^["']|["']$/g, "")
        .toLowerCase()
      if (cleaned && cleaned.length <= 40) ack = cleaned
    } catch {
      // keep default ack
    }

    // After saving a drop-in, give Alibi a chance to spontaneously speak up.
    // Cadence rules inside maybeGenerateProactiveMessage decide whether it actually does.
    let proactive: ProactiveMessage | null = null
    try {
      proactive = await maybeGenerateProactiveMessage(user.id)
    } catch {
      // proactive messaging is best-effort; never block a drop-in
    }

    return { type: "drop_in", entry: entry as Entry, ack, proactive }
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
      model: aiModel,
      system: [
        "You are Alibi: the friend who remembers the user's day so they don't have to defend it to themselves.",
        "The user is in a guilt spiral — they feel they did nothing, or they're being hard on themselves.",
        "Your job: read their day back to them, with warmth, using ONLY their actual logged entries as evidence.",
        "",
        "Hard rules:",
        "- speak in lowercase, conversational, like a calm friend texting",
        "- be specific — quote their actual entries, project names, durations",
        "- do not perform positivity, do not exclaim, do not use emojis",
        '- do not suggest techniques (no breathing, no journaling, no "try to")',
        "- do not lecture about productivity or self-care",
        '- if they have entries, list them in plain language (e.g. "today you...")',
        "- if they have NO entries today, gently say so without judgment, and remind them the day isn't over",
        '- end with ONE short kind line (e.g. "be nice to yourself." / "that\'s a real day." / "that counts.")',
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
  } catch {
    // keep default reflection
  }

  return { type: "check_in", reflection }
}
