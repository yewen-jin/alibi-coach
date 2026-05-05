import type {
  EffortLevel,
  Mood,
  Satisfaction,
  TimeBlockCategory,
} from "@/lib/types";

export interface CompanionDraft {
  task_name: string | null;
  category: TimeBlockCategory | null;
  hashtags: string[];
  notes: string | null;
  started_at: string | null;
  ended_at: string | null;
  duration_minutes: number | null;
  mood: Mood | null;
  effort_level: EffortLevel | null;
  satisfaction: Satisfaction | null;
  avoidance_marker: boolean;
  hyperfocus_marker: boolean;
  guilt_marker: boolean;
  novelty_marker: boolean;
}

export type CategoryInference = {
  category: TimeBlockCategory | null;
  source: "extracted" | "inferred" | "none";
};

export const CATEGORIES = [
  "deep_work",
  "admin",
  "social",
  "errands",
  "care",
  "creative",
  "rest",
] as const satisfies readonly TimeBlockCategory[];

const CATEGORY_KEYWORDS: Record<TimeBlockCategory, RegExp> = {
  deep_work:
    /\b(code|coding|bug|debug|write|writing|design|deep|client|build|research|draft|strategy|proposal)\b/,
  admin:
    /\b(email|admin|invoice|invoices|paperwork|forms|planning|schedule|budget|tax|receipt|receipts)\b/,
  social:
    /\b(meeting|call|coffee|lunch|friend|team|standup|sync|chat|catchup|catch-up)\b/,
  errands:
    /\b(shop|shopping|grocery|groceries|errand|errands|bank|post office|pickup|pick up|delivery)\b/,
  care: /\b(clean|cook|doctor|therapy|exercise|walk|shower|laundry|meds|meal|dinner|breakfast)\b/,
  creative:
    /\b(draw|drawing|music|paint|painting|song|photo|creative|sketch|film|video|edit)\b/,
  rest: /\b(rest|nap|sleep|break|recover|recovery|downtime)\b/,
};

export function deriveWindow(
  draft: CompanionDraft,
): { startedAt: string; endedAt: string } | null {
  if (draft.started_at && draft.ended_at) {
    const startedAt = new Date(draft.started_at);
    const endedAt = new Date(draft.ended_at);

    if (
      !Number.isNaN(startedAt.getTime()) &&
      endedAt.getTime() > startedAt.getTime()
    ) {
      return {
        startedAt: startedAt.toISOString(),
        endedAt: endedAt.toISOString(),
      };
    }
  }

  if (draft.ended_at && draft.duration_minutes) {
    const endedAt = new Date(draft.ended_at);
    if (!Number.isNaN(endedAt.getTime())) {
      return {
        startedAt: new Date(
          endedAt.getTime() - draft.duration_minutes * 60_000,
        ).toISOString(),
        endedAt: endedAt.toISOString(),
      };
    }
  }

  if (draft.started_at && draft.duration_minutes) {
    const startedAt = new Date(draft.started_at);
    if (!Number.isNaN(startedAt.getTime())) {
      return {
        startedAt: startedAt.toISOString(),
        endedAt: new Date(
          startedAt.getTime() + draft.duration_minutes * 60_000,
        ).toISOString(),
      };
    }
  }

  if (draft.duration_minutes) {
    const endedAt = new Date();
    return {
      startedAt: new Date(
        endedAt.getTime() - draft.duration_minutes * 60_000,
      ).toISOString(),
      endedAt: endedAt.toISOString(),
    };
  }

  return null;
}

export function inferCategoryFromText(text: string): TimeBlockCategory | null {
  const lower = text.toLowerCase();
  const matches = CATEGORIES.filter((category) =>
    CATEGORY_KEYWORDS[category].test(lower),
  );
  return matches.length === 1 ? matches[0] : null;
}

export function categoryTextForDraft(draft: CompanionDraft): string {
  return [draft.task_name, draft.notes, ...draft.hashtags]
    .filter(Boolean)
    .join(" ");
}

export function resolveCategory(draft: CompanionDraft): CategoryInference {
  if (draft.category) {
    return { category: draft.category, source: "extracted" };
  }

  const inferred = inferCategoryFromText(categoryTextForDraft(draft));
  return inferred
    ? { category: inferred, source: "inferred" }
    : { category: null, source: "none" };
}

export function getDayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}
