import type {
  ActiveTimer,
  TimeBlockCategory,
  TimeBlockCategoryRecord,
} from "@/lib/types";

export const FALLBACK_CATEGORIES = [
  {
    id: "deep_work",
    user_id: null,
    slug: "deep_work",
    name: "deep work",
    color: "#3253C7",
    is_default: true,
    created_at: "",
    updated_at: "",
  },
  {
    id: "admin",
    user_id: null,
    slug: "admin",
    name: "admin",
    color: "#93A5E4",
    is_default: true,
    created_at: "",
    updated_at: "",
  },
  {
    id: "social",
    user_id: null,
    slug: "social",
    name: "social",
    color: "#BF7DAD",
    is_default: true,
    created_at: "",
    updated_at: "",
  },
  {
    id: "errands",
    user_id: null,
    slug: "errands",
    name: "errands",
    color: "#43849D",
    is_default: true,
    created_at: "",
    updated_at: "",
  },
  {
    id: "care",
    user_id: null,
    slug: "care",
    name: "care",
    color: "#BF7DAD",
    is_default: true,
    created_at: "",
    updated_at: "",
  },
  {
    id: "creative",
    user_id: null,
    slug: "creative",
    name: "creative",
    color: "#3253C7",
    is_default: true,
    created_at: "",
    updated_at: "",
  },
  {
    id: "rest",
    user_id: null,
    slug: "rest",
    name: "rest",
    color: "#43849D",
    is_default: true,
    created_at: "",
    updated_at: "",
  },
] satisfies TimeBlockCategoryRecord[];

export function formatElapsed(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((part) => part.toString().padStart(2, "0"))
    .join(":");
}

export function getElapsedSeconds(
  activeTimer: ActiveTimer | null,
  now: number,
) {
  if (!activeTimer) {
    return 0;
  }

  const startedAt = new Date(activeTimer.started_at).getTime();

  if (Number.isNaN(startedAt)) {
    return 0;
  }

  return Math.max(0, Math.floor((now - startedAt) / 1000));
}

export function formatDuration(
  seconds: number | null,
  start: string,
  end: string | null,
) {
  let totalSeconds = seconds;

  if (totalSeconds === null && end) {
    totalSeconds = Math.max(
      0,
      Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 1000),
    );
  }

  if (!totalSeconds) {
    return "0m";
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.round((totalSeconds % 3600) / 60);

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (hours > 0) {
    return `${hours}h`;
  }

  return `${Math.max(1, minutes)}m`;
}

export function formatTime(value: string | null) {
  if (!value) {
    return "--:--";
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatChatTimestamp(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatDateHeading(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function toDateTimeLocal(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function fromDateTimeLocal(value: string) {
  return new Date(value).toISOString();
}

export function getTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return {
    start,
    end,
    input: {
      start: start.toISOString(),
      end: end.toISOString(),
    },
  };
}

export function parseHashtags(value: string) {
  return value
    .split(/[\s,]+/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function createCategoryMetaMap(categories: TimeBlockCategoryRecord[]) {
  return new Map(categories.map((category) => [category.slug, category]));
}

export function getCategoryMeta(
  category: TimeBlockCategory | null,
  categoriesBySlug:
    | Map<TimeBlockCategoryRecord["slug"], TimeBlockCategoryRecord>
    | TimeBlockCategoryRecord[],
) {
  const matched = Array.isArray(categoriesBySlug)
    ? categoriesBySlug.find((item) => item.slug === category)
    : categoriesBySlug.get(category ?? "");

  return (
    matched ?? {
      id: "uncategorized",
      user_id: null,
      slug: category ?? "uncategorized",
      name: category ? category.replace(/_/g, " ") : "uncategorized",
      color: "#93A5E4",
      is_default: false,
      created_at: "",
      updated_at: "",
    }
  );
}
