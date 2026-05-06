"use server";

import { generateText, Output } from "ai";
import { z } from "zod";
import { companionModel, companionModelId, fastModel } from "@/lib/ai";
import {
  CATEGORIES,
  categoryTextForDraft,
  deriveWindow,
  getDayRange,
  inferCategoryFromText,
  resolveCategory,
} from "@/lib/block-draft-utils";
import type {
  CompanionDraft,
  CategoryInference,
} from "@/lib/block-draft-utils";
import { alibiCompanionGuide } from "@/lib/companion-voice";
import { generateCompanionMessageInsightRecord } from "@/lib/chat-insights";
import { formatInsightForPrompt } from "@/lib/note-insights";
import { createClient } from "@/lib/supabase/server";
import { getCalendarData, saveBlock, startTimer, stopTimer } from "./timer";
import type {
  ActiveTimer,
  CompanionConversation,
  CompanionConversationContextSnapshot,
  CompanionMessage,
  CompanionMessageType,
  CompanionThreadState,
  CompanionTimeBlockContext,
  EffortLevel,
  Mood,
  Satisfaction,
  SaveBlockInput,
  TimeBlock,
  TimeBlockCategory,
  TimeBlockInsight,
} from "@/lib/types";
const MOODS = [
  "joyful",
  "neutral",
  "flat",
  "anxious",
  "guilty",
  "proud",
] as const satisfies readonly Mood[];
const EFFORT_LEVELS = [
  "easy",
  "medium",
  "hard",
  "grind",
] as const satisfies readonly EffortLevel[];
const SATISFACTION_LEVELS = [
  "satisfied",
  "mixed",
  "frustrated",
  "unclear",
] as const satisfies readonly Satisfaction[];

const companionDraftSchema = z.object({
  task_name: z.string().nullable(),
  category: z.string().nullable(),
  hashtags: z.array(z.string()),
  notes: z.string().nullable(),
  started_at: z.string().nullable(),
  ended_at: z.string().nullable(),
  duration_minutes: z.number().nullable(),
  mood: z.enum(MOODS).nullable(),
  effort_level: z.enum(EFFORT_LEVELS).nullable(),
  satisfaction: z.enum(SATISFACTION_LEVELS).nullable(),
  avoidance_marker: z.boolean(),
  hyperfocus_marker: z.boolean(),
  guilt_marker: z.boolean(),
  novelty_marker: z.boolean(),
});

const routerSchema = companionDraftSchema.extend({
  intent: z.enum([
    "companion_chat",
    "log_block",
    "start_timer",
    "stop_timer",
    "analyse_blocks",
    "clarify",
  ]),
});

export interface ProcessCompanionMessageInput {
  text: string;
  conversationId?: string | null;
  relatedTimeBlockId?: string | null;
  timezone?: string | null;
}

export type ProcessCompanionMessageResult = (
  | {
      type: "logged";
      ack: string;
      timeBlock: TimeBlock;
    }
  | {
      type: "timer_started";
      ack: string;
      activeTimer: ActiveTimer;
    }
  | {
      type: "timer_already_running";
      ack: string;
      activeTimer: ActiveTimer;
    }
  | {
      type: "timer_stopped";
      ack: string;
      timeBlock: TimeBlock;
    }
  | {
      type: "timer_not_running";
      message: string;
    }
  | {
      type: "analysis";
      message: string;
    }
  | {
      type: "conversation";
      message: string;
    }
  | {
      type: "clarify";
      question: string;
      draft: CompanionDraft;
    }
  | {
      type: "error";
      message: string;
    }
) &
  CompanionThreadState;

type RouterIntent =
  | "companion_chat"
  | "log_block"
  | "start_timer"
  | "stop_timer"
  | "analyse_blocks"
  | "clarify";

interface RouterOutput extends CompanionDraft {
  intent: RouterIntent;
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

function isMood(value: unknown): value is Mood {
  return (
    typeof value === "string" && (MOODS as readonly string[]).includes(value)
  );
}

function isEffort(value: unknown): value is EffortLevel {
  return (
    typeof value === "string" &&
    (EFFORT_LEVELS as readonly string[]).includes(value)
  );
}

function isSatisfaction(value: unknown): value is Satisfaction {
  return (
    typeof value === "string" &&
    (SATISFACTION_LEVELS as readonly string[]).includes(value)
  );
}

function cleanString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

function slugifyCategoryName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
}

function cleanCategory(value: unknown): TimeBlockCategory | null {
  const cleaned = cleanString(value);
  if (!cleaned) {
    return null;
  }

  const slug = slugifyCategoryName(cleaned);
  return /^[a-z0-9][a-z0-9_-]{0,63}$/.test(slug) ? slug : null;
}

function cleanTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().toLowerCase().replace(/^#+/, ""))
    .filter(Boolean);
}

function cleanIso(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function cleanDuration(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  return Math.round(value);
}

function mergeDraft(
  base: CompanionDraft | null | undefined,
  next: CompanionDraft,
): CompanionDraft {
  return {
    task_name: next.task_name ?? base?.task_name ?? null,
    category: next.category ?? base?.category ?? null,
    hashtags: next.hashtags.length > 0 ? next.hashtags : (base?.hashtags ?? []),
    notes: next.notes ?? base?.notes ?? null,
    started_at: next.started_at ?? base?.started_at ?? null,
    ended_at: next.ended_at ?? base?.ended_at ?? null,
    duration_minutes: next.duration_minutes ?? base?.duration_minutes ?? null,
    mood: next.mood ?? base?.mood ?? null,
    effort_level: next.effort_level ?? base?.effort_level ?? null,
    satisfaction: next.satisfaction ?? base?.satisfaction ?? null,
    avoidance_marker: next.avoidance_marker || base?.avoidance_marker === true,
    hyperfocus_marker:
      next.hyperfocus_marker || base?.hyperfocus_marker === true,
    guilt_marker: next.guilt_marker || base?.guilt_marker === true,
    novelty_marker: next.novelty_marker || base?.novelty_marker === true,
  };
}

function normalizeDraft(value: unknown): CompanionDraft | null {
  const parsed = companionDraftSchema.safeParse(value);

  if (!parsed.success) {
    return null;
  }

  return normalizeRouterOutput({ intent: "log_block", ...parsed.data }, "")
    .draft;
}

function normalizeRouterOutput(
  parsed: Partial<z.infer<typeof routerSchema>> | null,
  fallbackText: string,
): RouterOutput & { draft: CompanionDraft } {
  const intent = parsed?.intent;
  const normalizedIntent: RouterIntent =
    intent === "companion_chat" ||
    intent === "start_timer" ||
    intent === "stop_timer" ||
    intent === "analyse_blocks" ||
    intent === "clarify" ||
    intent === "log_block"
      ? intent
      : "companion_chat";

  const output: RouterOutput = {
    intent: normalizedIntent,
    task_name: cleanString(parsed?.task_name) ?? (parsed ? null : fallbackText),
    category: cleanCategory(parsed?.category),
    hashtags: cleanTags(parsed?.hashtags),
    notes: cleanString(parsed?.notes),
    started_at: cleanIso(parsed?.started_at),
    ended_at: cleanIso(parsed?.ended_at),
    duration_minutes: cleanDuration(parsed?.duration_minutes),
    mood: isMood(parsed?.mood) ? parsed.mood : null,
    effort_level: isEffort(parsed?.effort_level) ? parsed.effort_level : null,
    satisfaction: isSatisfaction(parsed?.satisfaction)
      ? parsed.satisfaction
      : null,
    avoidance_marker: parsed?.avoidance_marker === true,
    hyperfocus_marker: parsed?.hyperfocus_marker === true,
    guilt_marker: parsed?.guilt_marker === true,
    novelty_marker: parsed?.novelty_marker === true,
  };

  return {
    ...output,
    draft: output,
  };
}

function draftToSaveInput(
  draft: CompanionDraft,
  window: { startedAt: string; endedAt: string },
  category: TimeBlockCategory,
): SaveBlockInput {
  const taskName = draft.task_name?.trim() || "logged work";

  return {
    task_name: taskName,
    category,
    started_at: window.startedAt,
    ended_at: window.endedAt,
    hashtags: draft.hashtags,
    notes: draft.notes,
    mood: draft.mood,
    effort_level: draft.effort_level,
    satisfaction: draft.satisfaction,
    avoidance_marker: draft.avoidance_marker,
    hyperfocus_marker: draft.hyperfocus_marker,
    guilt_marker: draft.guilt_marker,
    novelty_marker: draft.novelty_marker,
  };
}

function getAnalysisRange(draft: CompanionDraft | null | undefined) {
  if (draft?.started_at && draft.ended_at) {
    const startedAt = new Date(draft.started_at);
    const endedAt = new Date(draft.ended_at);

    if (
      !Number.isNaN(startedAt.getTime()) &&
      endedAt.getTime() > startedAt.getTime()
    ) {
      return {
        start: startedAt.toISOString(),
        end: endedAt.toISOString(),
      };
    }
  }

  return getDayRange();
}

function snapshotTimeBlock(block: TimeBlock): CompanionTimeBlockContext {
  return {
    id: block.id,
    task_name: block.task_name,
    category: block.category,
    hashtags: block.hashtags ?? [],
    notes: block.notes,
    started_at: block.started_at,
    ended_at: block.ended_at,
    duration_seconds: block.duration_seconds,
    mood: block.mood,
    effort_level: block.effort_level,
    satisfaction: block.satisfaction,
    avoidance_marker: block.avoidance_marker,
    hyperfocus_marker: block.hyperfocus_marker,
    guilt_marker: block.guilt_marker,
    novelty_marker: block.novelty_marker,
  };
}

function formatBlockForPrompt(block: TimeBlock | CompanionTimeBlockContext) {
  const duration = block.duration_seconds
    ? `${Math.round(block.duration_seconds / 60)} min`
    : "duration unknown";
  const startedAt = new Date(block.started_at).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const task = block.task_name ?? "unnamed block";
  const category = block.category
    ? block.category.replace("_", " ")
    : "uncategorized";
  const tags = block.hashtags?.length ? ` #${block.hashtags.join(" #")}` : "";
  const notes = block.notes ? `\n  note: ${block.notes}` : "";
  const metadata = [
    block.mood ? `mood=${block.mood}` : "",
    block.effort_level ? `effort=${block.effort_level}` : "",
    block.satisfaction ? `satisfaction=${block.satisfaction}` : "",
    block.avoidance_marker ? "avoidance_marker=true" : "",
    block.hyperfocus_marker ? "hyperfocus_marker=true" : "",
    block.guilt_marker ? "guilt_marker=true" : "",
    block.novelty_marker ? "novelty_marker=true" : "",
  ].filter(Boolean);
  const meta = metadata.length ? `\n  metadata: ${metadata.join(", ")}` : "";

  return `- ${startedAt}: ${task} (${category}, ${duration})${tags}${notes}${meta}`;
}

function formatMessageForPrompt(message: CompanionMessage) {
  return `${message.role}: ${message.content}`;
}

function looksLikeLogAttempt(
  text: string,
  draft: CompanionDraft | null | undefined,
  routed: RouterOutput,
) {
  if (draft) {
    return true;
  }

  if (
    routed.started_at ||
    routed.ended_at ||
    routed.duration_minutes ||
    routed.category
  ) {
    return true;
  }

  return /\b(log|logged|record|add|save|spent|worked on|finished|completed|did|from \d{1,2}|for \d+)\b/i.test(
    text,
  );
}

async function fetchTimeBlockForUser(
  supabase: Supabase,
  userId: string,
  timeBlockId: string,
) {
  const { data, error } = await supabase
    .from("time_blocks")
    .select("*")
    .eq("user_id", userId)
    .eq("id", timeBlockId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as TimeBlock;
}

async function fetchNoteInsightsForBlocks(
  supabase: Supabase,
  userId: string,
  blockIds: string[],
) {
  if (blockIds.length === 0) {
    return [] as TimeBlockInsight[];
  }

  const { data, error } = await supabase
    .from("time_block_insights")
    .select("*")
    .eq("user_id", userId)
    .in("time_block_id", blockIds);

  if (error) {
    return [] as TimeBlockInsight[];
  }

  return (data ?? []) as TimeBlockInsight[];
}

async function fetchCompanionMessagesForConversation(
  supabase: Supabase,
  userId: string,
  conversationId: string,
) {
  const { data, error } = await supabase
    .from("companion_messages")
    .select("*")
    .eq("user_id", userId)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    return { type: "error" as const, message: "couldn't load chat history." };
  }

  return {
    type: "loaded" as const,
    messages: (data ?? []) as CompanionMessage[],
  };
}

async function getGeneralConversation(supabase: Supabase, userId: string) {
  const { data: existing } = await supabase
    .from("companion_conversations")
    .select("*")
    .eq("user_id", userId)
    .eq("kind", "general")
    .is("related_time_block_id", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existing) {
    return existing as CompanionConversation;
  }

  const snapshot: CompanionConversationContextSnapshot = { kind: "general" };
  const { data, error } = await supabase
    .from("companion_conversations")
    .insert({
      user_id: userId,
      kind: "general",
      title: "general",
      related_time_block_id: null,
      context_snapshot: snapshot,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error("couldn't create companion conversation.");
  }

  return data as CompanionConversation;
}

async function getTimeBlockConversation(
  supabase: Supabase,
  userId: string,
  timeBlockId: string,
) {
  const block = await fetchTimeBlockForUser(supabase, userId, timeBlockId);

  if (!block) {
    return null;
  }

  const { data: existing } = await supabase
    .from("companion_conversations")
    .select("*")
    .eq("user_id", userId)
    .eq("kind", "time_block")
    .eq("related_time_block_id", timeBlockId)
    .maybeSingle();

  if (existing) {
    return existing as CompanionConversation;
  }

  const snapshot: CompanionConversationContextSnapshot = {
    kind: "time_block",
    time_block: snapshotTimeBlock(block),
  };
  const title = block.task_name || "time block";
  const { data, error } = await supabase
    .from("companion_conversations")
    .insert({
      user_id: userId,
      kind: "time_block",
      title,
      related_time_block_id: timeBlockId,
      context_snapshot: snapshot,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error("couldn't create block companion conversation.");
  }

  return data as CompanionConversation;
}

async function getConversationForInput(
  supabase: Supabase,
  userId: string,
  input: {
    conversationId?: string | null;
    relatedTimeBlockId?: string | null;
  },
) {
  if (input.relatedTimeBlockId) {
    return getTimeBlockConversation(supabase, userId, input.relatedTimeBlockId);
  }

  if (input.conversationId) {
    const { data } = await supabase
      .from("companion_conversations")
      .select("*")
      .eq("user_id", userId)
      .eq("id", input.conversationId)
      .maybeSingle();

    if (data) {
      return data as CompanionConversation;
    }
  }

  return getGeneralConversation(supabase, userId);
}

async function insertCompanionMessage(
  supabase: Supabase,
  userId: string,
  conversation: CompanionConversation,
  values: {
    role: "user" | "assistant";
    content: string;
    messageType?: CompanionMessageType;
    metadata?: Record<string, unknown>;
  },
) {
  const { data, error } = await supabase
    .from("companion_messages")
    .insert({
      user_id: userId,
      conversation_id: conversation.id,
      role: values.role,
      content: values.content,
      message_type: values.messageType ?? "chat",
      model: companionModelId,
      related_time_block_id: conversation.related_time_block_id,
      metadata: values.metadata ?? {},
    })
    .select("*")
    .single();

  if (error || !data) {
    return { type: "error" as const, message: "couldn't save chat history." };
  }

  await supabase
    .from("companion_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversation.id)
    .eq("user_id", userId);

  return { type: "inserted" as const, message: data as CompanionMessage };
}

async function upsertCompanionMessageInsight(
  supabase: Supabase,
  message: CompanionMessage,
  conversation: CompanionConversation,
) {
  const insight = await generateCompanionMessageInsightRecord(
    message,
    conversation,
  );

  if (!insight) {
    return;
  }

  await supabase.from("companion_message_insights").upsert(
    {
      user_id: insight.user_id,
      message_id: insight.message_id,
      conversation_id: insight.conversation_id,
      related_time_block_id: insight.related_time_block_id,
      scope: insight.scope,
      did_actions: insight.did_actions,
      intended_actions: insight.intended_actions,
      avoided_or_deferred: insight.avoided_or_deferred,
      friction_points: insight.friction_points,
      emotional_signals: insight.emotional_signals,
      useful_drift: insight.useful_drift,
      mismatch_signals: insight.mismatch_signals,
      themes: insight.themes,
      evidence_excerpt: insight.evidence_excerpt,
      model_version: insight.model_version,
    },
    { onConflict: "message_id" },
  );
}

async function getPendingDraft(
  supabase: Supabase,
  userId: string,
  conversationId: string,
) {
  const { data, error } = await supabase
    .from("companion_drafts")
    .select("draft, expires_at")
    .eq("user_id", userId)
    .eq("conversation_id", conversationId)
    .eq("status", "pending")
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  if (data.expires_at && new Date(data.expires_at).getTime() <= Date.now()) {
    await supabase
      .from("companion_drafts")
      .update({ status: "resolved", updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("conversation_id", conversationId);
    return null;
  }

  return normalizeDraft(data.draft);
}

async function savePendingDraft(
  supabase: Supabase,
  userId: string,
  conversationId: string,
  draft: CompanionDraft,
) {
  await supabase.from("companion_drafts").upsert({
    user_id: userId,
    conversation_id: conversationId,
    draft,
    status: "pending",
    updated_at: new Date().toISOString(),
    expires_at: null,
  });
}

async function resolvePendingDraft(
  supabase: Supabase,
  userId: string,
  conversationId: string,
) {
  await supabase
    .from("companion_drafts")
    .update({ status: "resolved", updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("conversation_id", conversationId)
    .eq("status", "pending");
}

async function getThreadState(
  supabase: Supabase,
  userId: string,
  conversation: CompanionConversation,
): Promise<CompanionThreadState> {
  const [messagesResult, pendingDraft] = await Promise.all([
    fetchCompanionMessagesForConversation(supabase, userId, conversation.id),
    conversation.kind === "general"
      ? getPendingDraft(supabase, userId, conversation.id)
      : Promise.resolve(null),
  ]);

  return {
    conversation,
    messages: messagesResult.type === "loaded" ? messagesResult.messages : [],
    hasPendingDraft: pendingDraft !== null,
  };
}

async function withThreadState<
  T extends Omit<
    ProcessCompanionMessageResult,
    "conversation" | "messages" | "hasPendingDraft"
  >,
>(
  supabase: Supabase,
  userId: string,
  conversation: CompanionConversation,
  result: T,
): Promise<T & CompanionThreadState> {
  const state = await getThreadState(supabase, userId, conversation);
  return { ...result, ...state };
}

export async function getCompanionThread(input?: {
  relatedTimeBlockId?: string | null;
  conversationId?: string | null;
}): Promise<CompanionThreadState | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  try {
    const conversation = await getConversationForInput(
      supabase,
      user.id,
      input ?? {},
    );
    if (!conversation) {
      return null;
    }
    return getThreadState(supabase, user.id, conversation);
  } catch {
    return null;
  }
}

export async function getCompanionMessages(): Promise<CompanionMessage[]> {
  const thread = await getCompanionThread();
  return thread?.messages ?? [];
}

export async function getCompanionHasPendingDraft(): Promise<boolean> {
  const thread = await getCompanionThread();
  return thread?.hasPendingDraft ?? false;
}

async function routeMessage(
  text: string,
  draft: CompanionDraft | null | undefined,
  timezone: string | null | undefined,
  recentMessages: CompanionMessage[],
): Promise<RouterOutput> {
  try {
    const { output } = await generateText({
      model: fastModel,
      output: Output.object({ schema: routerSchema }),
      prompt: [
        "Classify this Alibi chat message and extract structured time-block data.",
        "",
        "Valid intents: companion_chat, log_block, start_timer, stop_timer, analyse_blocks, clarify.",
        "Use companion_chat for ordinary conversation, emotional check-ins, uncertainty, venting, or anything that is not clearly a request to save completed work.",
        "Use log_block only when the user is recording completed work or gives a clear completed-work statement with timing/category details.",
        "Use start_timer or stop_timer for explicit timer control.",
        "Use analyse_blocks when they ask what they did, how long they spent, patterns, or reassurance from saved records.",
        "Use clarify only when the new message answers a prior clarification but is still incomplete.",
        "",
        "Schema:",
        "{",
        '  "intent": "companion_chat" | "log_block" | "start_timer" | "stop_timer" | "analyse_blocks" | "clarify",',
        '  "task_name": "string | null",',
        '  "category": "category name or slug | null",',
        '  "hashtags": ["strings without #"],',
        '  "notes": "string | null",',
        '  "started_at": "ISO datetime | null",',
        '  "ended_at": "ISO datetime | null",',
        '  "duration_minutes": "number | null",',
        '  "mood": "joyful | neutral | flat | anxious | guilty | proud | null",',
        '  "effort_level": "easy | medium | hard | grind | null",',
        '  "satisfaction": "satisfied | mixed | frustrated | unclear | null",',
        '  "avoidance_marker": "boolean",',
        '  "hyperfocus_marker": "boolean",',
        '  "guilt_marker": "boolean",',
        '  "novelty_marker": "boolean"',
        "}",
        "",
        "Rules:",
        "- Resolve relative dates and times against the current date and timezone.",
        "- If the user says a range like '2 to 3:30', return both started_at and ended_at.",
        "- If they give a duration only, return duration_minutes.",
        "- Do not invent a time window.",
        "- Prefer concise task names without filler words like 'worked on'.",
        "- Use an existing/default category when obvious: deep_work, admin, social, errands, care, creative, rest.",
        "- If the user gives a custom category name, return that name.",
        "- Do not turn feelings, questions, or general updates into log_block.",
        "- When unsure whether the user wants to log a block, choose companion_chat.",
        "",
        `Current timestamp: ${new Date().toISOString()}`,
        `User timezone: ${timezone || "unknown"}`,
        `Prior draft, if any: ${JSON.stringify(draft ?? null)}`,
        "Recent visible messages:",
        recentMessages.length
          ? recentMessages.map(formatMessageForPrompt).join("\n")
          : "(none)",
        `User message: ${text}`,
      ].join("\n"),
    });

    return normalizeRouterOutput(output, text);
  } catch {
    return normalizeRouterOutput(null, text);
  }
}

async function makeAck(
  kind: "logged" | "started" | "stopped",
  subject: string,
) {
  const fallback =
    kind === "started"
      ? "timer running."
      : kind === "stopped"
        ? "timer stopped."
        : "logged.";

  try {
    const { text } = await generateText({
      model: fastModel,
      prompt: [
        "You are Alibi. Write one short lowercase acknowledgment.",
        "Rules: 2 to 5 words, end with a period, no emojis, no exclamation marks, no praise.",
        `Action: ${kind}`,
        `Subject: ${subject}`,
      ].join("\n"),
    });
    const cleaned = text
      .trim()
      .replace(/^["']|["']$/g, "")
      .toLowerCase();
    return cleaned && cleaned.length <= 48 ? cleaned : fallback;
  } catch {
    return fallback;
  }
}

async function analyseBlocks(
  message: string,
  draft: CompanionDraft | null | undefined,
  recentMessages: CompanionMessage[],
) {
  const range = getAnalysisRange(draft);
  const result = await getCalendarData(range);

  if (result.type === "error") {
    return result.message;
  }

  const blocks = result.timeBlocks;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const blockIds = blocks.map((block) => block.id);
  const [noteInsights, linkedMessagesResult] = user
    ? await Promise.all([
        fetchNoteInsightsForBlocks(supabase, user.id, blockIds),
        supabase
          .from("companion_messages")
          .select("*")
          .eq("user_id", user.id)
          .in("related_time_block_id", blockIds)
          .order("created_at", { ascending: true }),
      ])
    : [[], { data: [], error: null }];
  const insightsByBlock = new Map(
    noteInsights.map((insight) => [insight.time_block_id, insight]),
  );
  const linkedMessages = linkedMessagesResult.error
    ? []
    : ((linkedMessagesResult.data ?? []) as CompanionMessage[]);
  const context = blocks.length
    ? blocks
        .map((block) => {
          const insight = insightsByBlock.get(block.id);
          const derived = insight
            ? `\n  note-derived insight: ${formatInsightForPrompt(insight)}`
            : "";
          return `${formatBlockForPrompt(block)}${derived}`;
        })
        .join("\n")
    : "(no time blocks saved today)";

  try {
    const { text } = await generateText({
      model: companionModel,
      system: [
        "You are Alibi: the friend who remembers the user's day so they don't have to defend it to themselves.",
        alibiCompanionGuide,
        "Answer using ONLY the provided context.",
        "Use evidence in this order: time block notes, time block metadata, note-derived insights, linked chat, then recent general chat.",
        "When describing a pattern, cite the note/time evidence that supports it.",
        "General chat can add tone or continuity, but it must not override a time block note unless the user explicitly says the block record is wrong.",
        "Stay under 90 words.",
        "Do not mention entries. Do not invent unsaved work. Do not give productivity advice.",
      ].join("\n"),
      prompt: [
        `User asked: ${message}`,
        `Pending draft, if any: ${JSON.stringify(draft ?? null)}`,
        "Recent visible messages:",
        recentMessages.length
          ? recentMessages.map(formatMessageForPrompt).join("\n")
          : "(none)",
        "",
        "Saved time_blocks in range:",
        context,
        "",
        "Linked companion messages for those blocks:",
        linkedMessages.length
          ? linkedMessages.map(formatMessageForPrompt).join("\n")
          : "(none)",
      ].join("\n"),
    });

    return text.trim() || "nothing on the record yet today.";
  } catch {
    if (blocks.length === 0) {
      return "nothing on the record yet today.";
    }

    return `today has ${blocks.length} saved block${blocks.length === 1 ? "" : "s"}: ${blocks
      .map((block) => block.task_name ?? "unnamed block")
      .join(", ")}.`;
  }
}

async function companionChat(
  message: string,
  recentMessages: CompanionMessage[],
) {
  const result = await getCalendarData(getDayRange());
  const context =
    result.type === "loaded" && result.timeBlocks.length
      ? result.timeBlocks.map(formatBlockForPrompt).join("\n")
      : "(no saved time blocks today)";

  try {
    const { text } = await generateText({
      model: companionModel,
      system: [
        "You are Alibi: a conversational witness for the user's day.",
        alibiCompanionGuide,
        "Do not behave like a form or parser.",
        "Do not ask for exact time or duration unless the user is clearly trying to log completed work.",
        "If the user is vague, respond conversationally first; you may ask one gentle open question.",
        "Use saved time_blocks only as context, not as a script.",
        "If you refer to saved evidence, treat block notes as the strongest source and chat history as secondary context.",
        "Stay under 70 words.",
      ].join("\n"),
      prompt: [
        `User message: ${message}`,
        "Recent visible messages:",
        recentMessages.length
          ? recentMessages.map(formatMessageForPrompt).join("\n")
          : "(none)",
        "",
        "Saved time_blocks today:",
        context,
      ].join("\n"),
    });

    return text.trim() || "i'm here. tell me the shape of it.";
  } catch {
    return "i'm here. tell me the shape of it.";
  }
}

async function timeBlockCompanionChat(
  message: string,
  conversation: CompanionConversation,
  recentMessages: CompanionMessage[],
) {
  const block = conversation.context_snapshot.time_block;

  if (!block) {
    return "i couldn't find the block context for this thread.";
  }

  try {
    const { text } = await generateText({
      model: companionModel,
      system: [
        "You are Alibi: a reflective companion for one saved time block.",
        alibiCompanionGuide,
        "This thread is only about the fixed block context provided below.",
        "Reflect, summarize, reinterpret, and help the user name what happened.",
        "Do not edit the block, create new time blocks, operate timers, or claim you changed stored data.",
        "Treat the block note as the strongest evidence.",
        "Stay under 90 words.",
      ].join("\n"),
      prompt: [
        `User message: ${message}`,
        "Fixed time block context:",
        formatBlockForPrompt(block),
        "",
        "Thread messages:",
        recentMessages.length
          ? recentMessages.map(formatMessageForPrompt).join("\n")
          : "(none)",
      ].join("\n"),
    });

    return text.trim() || "that block has more texture than it first looks.";
  } catch {
    return "that block has more texture than it first looks.";
  }
}

function clarificationQuestion(draft: CompanionDraft) {
  if (!deriveWindow(draft)) {
    return "what time was that, or about how long did it take?";
  }

  if (!draft.task_name?.trim()) {
    return "what should i call that block?";
  }

  if (!resolveCategory(draft).category) {
    return "what category should i file it under?";
  }

  return "what else should i add before i log it?";
}

export async function processCompanionMessage(
  input: ProcessCompanionMessageInput | string,
): Promise<ProcessCompanionMessageResult> {
  const text = typeof input === "string" ? input : input.text;
  const timezone = typeof input === "string" ? null : (input.timezone ?? null);
  const trimmed = text.trim();

  const emptyConversation: CompanionConversation = {
    id: "",
    user_id: "",
    kind: "general",
    title: null,
    related_time_block_id: null,
    context_snapshot: { kind: "general" },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (!trimmed) {
    return {
      type: "error",
      message: "say something.",
      conversation: emptyConversation,
      messages: [],
      hasPendingDraft: false,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      type: "error",
      message: "not signed in.",
      conversation: emptyConversation,
      messages: [],
      hasPendingDraft: false,
    };
  }

  const conversation = await getConversationForInput(
    supabase,
    user.id,
    typeof input === "string"
      ? {}
      : {
          conversationId: input.conversationId,
          relatedTimeBlockId: input.relatedTimeBlockId,
        },
  );

  if (!conversation) {
    return {
      type: "error",
      message: "couldn't open that companion thread.",
      conversation: emptyConversation,
      messages: [],
      hasPendingDraft: false,
    };
  }

  const userMessage = await insertCompanionMessage(
    supabase,
    user.id,
    conversation,
    {
      role: "user",
      content: trimmed,
    },
  );

  if (userMessage.type === "error") {
    return withThreadState(supabase, user.id, conversation, {
      type: "error",
      message: userMessage.message,
    });
  }

  await upsertCompanionMessageInsight(
    supabase,
    userMessage.message,
    conversation,
  ).catch(() => undefined);

  const messagesAfterUser = await fetchCompanionMessagesForConversation(
    supabase,
    user.id,
    conversation.id,
  );
  const recentMessages =
    messagesAfterUser.type === "loaded"
      ? messagesAfterUser.messages.slice(-6)
      : [userMessage.message];

  const finishWithAssistant = async <
    T extends Omit<
      ProcessCompanionMessageResult,
      "conversation" | "messages" | "hasPendingDraft"
    >,
  >(
    result: T,
    content: string,
    messageType: CompanionMessageType,
    metadata: Record<string, unknown> = {},
  ) => {
    await insertCompanionMessage(supabase, user.id, conversation, {
      role: "assistant",
      content,
      messageType,
      metadata,
    });

    return withThreadState(supabase, user.id, conversation, result);
  };

  if (conversation.kind === "time_block") {
    const message = await timeBlockCompanionChat(
      trimmed,
      conversation,
      recentMessages,
    );
    return finishWithAssistant(
      {
        type: "conversation",
        message,
      },
      message,
      "chat",
    );
  }

  const pendingDraft = await getPendingDraft(
    supabase,
    user.id,
    conversation.id,
  );
  const routed = await routeMessage(
    trimmed,
    pendingDraft,
    timezone,
    recentMessages,
  );
  const mergedDraft = mergeDraft(pendingDraft, routed);

  if (routed.intent === "start_timer") {
    const result = await startTimer();
    if (result.type === "started") {
      await resolvePendingDraft(supabase, user.id, conversation.id);
      const ack = await makeAck("started", mergedDraft.task_name ?? "timer");
      return finishWithAssistant(
        {
          type: "timer_started",
          ack,
          activeTimer: result.activeTimer,
        },
        ack,
        "ack",
      );
    }

    if (result.type === "already_running") {
      await resolvePendingDraft(supabase, user.id, conversation.id);
      return finishWithAssistant(
        {
          type: "timer_already_running",
          ack: "timer already running.",
          activeTimer: result.activeTimer,
        },
        "timer already running.",
        "ack",
      );
    }

    return finishWithAssistant(result, result.message, "error");
  }

  if (routed.intent === "stop_timer") {
    const result = await stopTimer({
      task_name: mergedDraft.task_name,
      category: mergedDraft.category,
      hashtags: mergedDraft.hashtags,
      notes: mergedDraft.notes,
      mood: mergedDraft.mood,
      effort_level: mergedDraft.effort_level,
      satisfaction: mergedDraft.satisfaction,
      avoidance_marker: mergedDraft.avoidance_marker,
      hyperfocus_marker: mergedDraft.hyperfocus_marker,
      guilt_marker: mergedDraft.guilt_marker,
      novelty_marker: mergedDraft.novelty_marker,
      note_source: "chat",
    });

    if (result.type === "stopped") {
      await resolvePendingDraft(supabase, user.id, conversation.id);
      const ack = await makeAck("stopped", mergedDraft.task_name ?? "timer");
      return finishWithAssistant(
        {
          type: "timer_stopped",
          ack,
          timeBlock: result.timeBlock,
        },
        ack,
        "ack",
      );
    }

    if (result.type === "not_running") {
      return finishWithAssistant(
        { type: "timer_not_running", message: "no timer is running." },
        "no timer is running.",
        "error",
      );
    }

    return finishWithAssistant(result, result.message, "error");
  }

  if (routed.intent === "analyse_blocks") {
    const message = await analyseBlocks(trimmed, mergedDraft, recentMessages);
    return finishWithAssistant(
      {
        type: "analysis",
        message,
      },
      message,
      "analysis",
    );
  }

  if (
    routed.intent === "companion_chat" ||
    !looksLikeLogAttempt(trimmed, pendingDraft, routed)
  ) {
    const message = await companionChat(trimmed, recentMessages);
    return finishWithAssistant(
      {
        type: "conversation",
        message,
      },
      message,
      "chat",
    );
  }

  const window = deriveWindow(mergedDraft);
  if (!window) {
    const question = clarificationQuestion(mergedDraft);
    await savePendingDraft(supabase, user.id, conversation.id, mergedDraft);
    return finishWithAssistant(
      {
        type: "clarify",
        question,
        draft: mergedDraft,
      },
      question,
      "clarification",
    );
  }

  if (!mergedDraft.task_name?.trim()) {
    const question = clarificationQuestion(mergedDraft);
    await savePendingDraft(supabase, user.id, conversation.id, mergedDraft);
    return finishWithAssistant(
      {
        type: "clarify",
        question,
        draft: mergedDraft,
      },
      question,
      "clarification",
    );
  }

  const category = resolveCategory(mergedDraft).category;
  if (!category) {
    const question = clarificationQuestion(mergedDraft);
    await savePendingDraft(supabase, user.id, conversation.id, mergedDraft);
    return finishWithAssistant(
      {
        type: "clarify",
        question,
        draft: mergedDraft,
      },
      question,
      "clarification",
    );
  }

  const result = await saveBlock({
    ...draftToSaveInput(mergedDraft, window, category),
    note_source: "chat",
  });

  if (result.type === "saved") {
    await resolvePendingDraft(supabase, user.id, conversation.id);
    const ack = await makeAck("logged", mergedDraft.task_name ?? "time block");
    return finishWithAssistant(
      {
        type: "logged",
        ack,
        timeBlock: result.timeBlock,
      },
      ack,
      "ack",
    );
  }

  if (result.type === "not_found") {
    return finishWithAssistant(
      { type: "error", message: "time block was not found." },
      "time block was not found.",
      "error",
    );
  }

  return finishWithAssistant(result, result.message, "error");
}

export const processMessage = processCompanionMessage;
