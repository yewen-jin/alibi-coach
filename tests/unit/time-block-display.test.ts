import { describe, expect, it, vi } from "vitest";
import {
  FALLBACK_CATEGORIES,
  createCategoryMetaMap,
  formatDuration,
  formatElapsed,
  getCategoryMeta,
  getElapsedSeconds,
  parseHashtags,
  toDateTimeLocal,
} from "@/lib/time-block-display";
import type { ActiveTimer, TimeBlockCategoryRecord } from "@/lib/types";

const categories = [
  {
    id: "1",
    user_id: null,
    slug: "deep_work",
    name: "deep work",
    color: "#3253C7",
    is_default: true,
    created_at: "",
    updated_at: "",
  },
] satisfies TimeBlockCategoryRecord[];

describe("time block display helpers", () => {
  it("formats elapsed seconds as clock time", () => {
    expect(formatElapsed(3661)).toBe("01:01:01");
  });

  it("returns zero elapsed seconds for invalid active timer dates", () => {
    const activeTimer = {
      started_at: "not-a-date",
    } as ActiveTimer;

    expect(getElapsedSeconds(activeTimer, Date.now())).toBe(0);
  });

  it("clamps elapsed seconds to zero when start is in the future", () => {
    const now = new Date("2026-05-05T10:00:00.000Z").getTime();
    const activeTimer = {
      started_at: "2026-05-05T10:01:00.000Z",
    } as ActiveTimer;

    expect(getElapsedSeconds(activeTimer, now)).toBe(0);
  });

  it("formats durations from stored seconds or timestamps", () => {
    expect(formatDuration(5400, "", null)).toBe("1h 30m");
    expect(
      formatDuration(
        null,
        "2026-05-05T10:00:00.000Z",
        "2026-05-05T10:30:00.000Z",
      ),
    ).toBe("30m");
  });

  it("parses hashtags split by comma or whitespace", () => {
    expect(parseHashtags("client, writing reset")).toEqual([
      "client",
      "writing",
      "reset",
    ]);
  });

  it("finds category metadata through a map", () => {
    const categoryMap = createCategoryMetaMap(categories);
    expect(getCategoryMeta("deep_work", categoryMap).name).toBe("deep work");
    expect(getCategoryMeta("custom_category", categoryMap).name).toBe(
      "custom category",
    );
  });

  it("uses a distinct color for each default category", () => {
    const colors = FALLBACK_CATEGORIES.map((category) => category.color);
    expect(new Set(colors).size).toBe(colors.length);
  });

  it("normalizes old default category colors to the current palette", () => {
    const categoryMap = createCategoryMetaMap([
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
    ]);

    expect(getCategoryMeta("creative", categoryMap).color).not.toBe("#3253C7");
  });

  it("returns empty datetime-local value for invalid input", () => {
    expect(toDateTimeLocal("not-a-date")).toBe("");
  });

  it("normalizes datetime-local values using local timezone", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-05T10:00:00.000Z"));

    expect(toDateTimeLocal("2026-05-05T10:00:00.000Z")).toMatch(
      /^2026-05-05T/,
    );

    vi.useRealTimers();
  });
});
