"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import {
  CalendarDays,
  Clock,
  Loader2,
  MessageCircle,
  Pencil,
  Plus,
  Play,
  RefreshCw,
  RotateCcw,
  Send,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { processCoachMessage } from "@/app/actions/process-message";
import {
  deleteBlock,
  getActiveTimer,
  getCalendarData,
  resumeBlock,
  saveBlock,
  startTimer,
  stopTimer,
} from "@/app/actions/timer";
import type {
  ActiveTimer,
  CoachMessage,
  TimeBlock,
  TimeBlockCategory,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { TopNav } from "./top-nav";

const CATEGORIES = [
  { value: "deep_work", label: "deep work", color: "#3253C7" },
  { value: "admin", label: "admin", color: "#93A5E4" },
  { value: "social", label: "social", color: "#BF7DAD" },
  { value: "errands", label: "errands", color: "#43849D" },
  { value: "care", label: "care", color: "#BF7DAD" },
  { value: "creative", label: "creative", color: "#3253C7" },
  { value: "rest", label: "rest", color: "#43849D" },
] satisfies Array<{ value: TimeBlockCategory; label: string; color: string }>;

type EditorState = {
  block?: TimeBlock;
  isNewlyStopped: boolean;
  isManual: boolean;
  taskName: string;
  category: TimeBlockCategory | "";
  hashtags: string;
  notes: string;
  startedAt: string;
  endedAt: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

interface TimerTrackerAppProps {
  userEmail: string | null;
  initialChatMessages?: CoachMessage[];
  initialHasPendingDraft?: boolean;
}

function formatElapsed(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((part) => part.toString().padStart(2, "0"))
    .join(":");
}

function getElapsedSeconds(activeTimer: ActiveTimer | null, now: number) {
  if (!activeTimer) {
    return 0;
  }

  const startedAt = new Date(activeTimer.started_at).getTime();

  if (Number.isNaN(startedAt)) {
    return 0;
  }

  return Math.max(0, Math.floor((now - startedAt) / 1000));
}

function formatDuration(
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

function formatTime(value: string | null) {
  if (!value) {
    return "--:--";
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDateHeading(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}

function toDateTimeLocal(value: string | null) {
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

function fromDateTimeLocal(value: string) {
  return new Date(value).toISOString();
}

function getTodayRange() {
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

function parseHashtags(value: string) {
  return value
    .split(/[\s,]+/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function createEditorState(
  block: TimeBlock,
  isNewlyStopped = false,
): EditorState {
  return {
    block,
    isNewlyStopped,
    isManual: false,
    taskName: block.task_name ?? "",
    category: block.category ?? "",
    hashtags: (block.hashtags ?? []).join(" "),
    notes: block.notes ?? "",
    startedAt: toDateTimeLocal(block.started_at),
    endedAt: toDateTimeLocal(block.ended_at),
  };
}

function createManualEditorState(): EditorState {
  const endedAt = new Date();
  const startedAt = new Date(endedAt.getTime() - 30 * 60_000);

  return {
    isNewlyStopped: false,
    isManual: true,
    taskName: "",
    category: "",
    hashtags: "",
    notes: "",
    startedAt: toDateTimeLocal(startedAt.toISOString()),
    endedAt: toDateTimeLocal(endedAt.toISOString()),
  };
}

function getCategoryMeta(category: TimeBlockCategory | null) {
  return (
    CATEGORIES.find((item) => item.value === category) ?? {
      value: "admin" as TimeBlockCategory,
      label: "uncategorized",
      color: "#93A5E4",
    }
  );
}

function coachMessageToChatMessage(message: CoachMessage): ChatMessage {
  return {
    id: message.id,
    role: message.role,
    text: message.content,
  };
}

export function TimerTrackerApp({
  userEmail,
  initialChatMessages = [],
  initialHasPendingDraft = false,
}: TimerTrackerAppProps) {
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() =>
    (Array.isArray(initialChatMessages) ? initialChatMessages : []).map(
      coachMessageToChatMessage,
    ),
  );
  const [hasPendingDraft, setHasPendingDraft] = useState(
    initialHasPendingDraft,
  );
  const [isPending, startTransition] = useTransition();
  const [isChatPending, startChatTransition] = useTransition();

  const today = useMemo(() => getTodayRange(), []);
  const elapsed = getElapsedSeconds(activeTimer, now);

  const loadTracker = useCallback(async () => {
    setError(null);
    const [timerResult, calendarResult] = await Promise.all([
      getActiveTimer(),
      getCalendarData(today.input),
    ]);

    if (timerResult.type === "loaded") {
      setActiveTimer(timerResult.activeTimer);
    } else {
      setError(timerResult.message);
    }

    if (calendarResult.type === "loaded") {
      setTimeBlocks(calendarResult.timeBlocks);
    } else {
      setError(calendarResult.message);
    }
  }, [today.input]);

  useEffect(() => {
    let mounted = true;

    async function hydrate() {
      setLoading(true);
      await loadTracker();
      if (mounted) {
        setLoading(false);
      }
    }

    hydrate();

    return () => {
      mounted = false;
    };
  }, [loadTracker]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const refreshBlocks = useCallback(async () => {
    const result = await getCalendarData(today.input);

    if (result.type === "loaded") {
      setTimeBlocks(result.timeBlocks);
      return;
    }

    setError(result.message);
  }, [today.input]);

  const handleStart = () => {
    setError(null);
    startTransition(async () => {
      const result = await startTimer();

      if (result.type === "started" || result.type === "already_running") {
        setActiveTimer(result.activeTimer);
        setNow(Date.now());
        return;
      }

      setError(result.message);
    });
  };

  const handleStop = () => {
    setError(null);
    startTransition(async () => {
      const result = await stopTimer();

      if (result.type === "stopped") {
        setActiveTimer(null);
        setEditor(createEditorState(result.timeBlock, true));
        await refreshBlocks();
        return;
      }

      if (result.type === "not_running") {
        setActiveTimer(null);
        setError("no timer is running.");
        await refreshBlocks();
        return;
      }

      if (result.timeBlock) {
        setEditor(createEditorState(result.timeBlock, true));
        await loadTracker();
      }

      setError(result.message);
    });
  };

  const handleSave = () => {
    if (!editor) {
      return;
    }

    setError(null);
    startTransition(async () => {
      if (!editor.taskName.trim()) {
        setError("task name is required.");
        return;
      }

      if (!editor.category) {
        setError("category is required.");
        return;
      }

      const startedAt = new Date(editor.startedAt);
      const endedAt = new Date(editor.endedAt);

      if (
        Number.isNaN(startedAt.getTime()) ||
        Number.isNaN(endedAt.getTime()) ||
        endedAt.getTime() <= startedAt.getTime()
      ) {
        setError("end time must be after start time.");
        return;
      }

      const result = await saveBlock({
        id: editor.block?.id,
        task_name: editor.taskName,
        category: editor.category,
        started_at: fromDateTimeLocal(editor.startedAt),
        ended_at: fromDateTimeLocal(editor.endedAt),
        hashtags: parseHashtags(editor.hashtags),
        notes: editor.notes,
      });

      if (result.type === "saved") {
        setEditor(null);
        await refreshBlocks();
        return;
      }

      setError(
        result.type === "not_found"
          ? "time block was not found."
          : result.message,
      );
    });
  };

  const handleDelete = (block: TimeBlock) => {
    setError(null);
    startTransition(async () => {
      const result = await deleteBlock({ id: block.id });

      if (result.type === "deleted") {
        if (editor?.block?.id === block.id) {
          setEditor(null);
        }

        await refreshBlocks();
        return;
      }

      setError(
        result.type === "not_found"
          ? "time block was not found."
          : result.message,
      );
    });
  };

  const handleResume = (block: TimeBlock) => {
    setError(null);
    setEditor(null);
    startTransition(async () => {
      const result = await resumeBlock({ id: block.id });

      if (result.type === "resumed" || result.type === "already_running") {
        setActiveTimer(result.activeTimer);
        setNow(Date.now());
        await refreshBlocks();
        return;
      }

      setError(
        result.type === "not_found"
          ? "time block was not found."
          : result.message,
      );
    });
  };

  const handleCoachMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isChatPending) {
        return;
      }

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        text: trimmed,
      };

      setChatMessages((messages) => [...messages, userMessage]);
      setError(null);

      startChatTransition(async () => {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const result = await processCoachMessage({
          text: trimmed,
          timezone,
        });

        const addAssistantMessage = (text: string) => {
          setChatMessages((messages) => [
            ...messages,
            {
              id: `assistant-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              role: "assistant",
              text,
            },
          ]);
        };
        const reconcileMessages = () => {
          if (Array.isArray(result.messages) && result.messages.length > 0) {
            setChatMessages(result.messages.map(coachMessageToChatMessage));
          }
          setHasPendingDraft(result.hasPendingDraft === true);
        };

        if (result.type === "error") {
          reconcileMessages();
          if (!Array.isArray(result.messages) || result.messages.length === 0) {
            addAssistantMessage(result.message);
          }
          return;
        }

        if (result.type === "clarify") {
          reconcileMessages();
          return;
        }

        reconcileMessages();

        if (
          result.type === "timer_started" ||
          result.type === "timer_already_running"
        ) {
          setActiveTimer(result.activeTimer);
          setNow(Date.now());
          return;
        }

        if (result.type === "timer_stopped") {
          setActiveTimer(null);
          setEditor(
            createEditorState(result.timeBlock, !result.timeBlock.task_name),
          );
          await refreshBlocks();
          return;
        }

        if (result.type === "logged") {
          await refreshBlocks();
          return;
        }
      });
    },
    [isChatPending, refreshBlocks],
  );

  return (
    <main className="alibi-page px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <TopNav userEmail={userEmail} />

        <section className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)]">
          <div className="flex flex-col gap-5">
            <section className="alibi-card-pop relative overflow-hidden p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-xs font-black uppercase tracking-[0.12em] text-alibi-teal">
                    active timer
                  </p>
                  <h1 className="mt-2 text-4xl font-black tracking-normal text-alibi-blue sm:text-5xl">
                    {formatElapsed(elapsed)}
                  </h1>
                </div>
                <div
                  className={cn(
                    "flex h-14 w-14 items-center justify-center rounded-2xl border-2",
                    activeTimer
                      ? "border-alibi-pink/30 bg-alibi-pink/20 text-alibi-pink"
                      : "border-alibi-teal/25 bg-alibi-teal/15 text-alibi-teal",
                  )}
                >
                  <Clock className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-5 flex items-center gap-3">
                {activeTimer ? (
                  <button
                    type="button"
                    onClick={handleStop}
                    disabled={isPending}
                    className="inline-flex h-11 min-w-32 items-center justify-center gap-2 rounded-2xl bg-alibi-pink px-4 text-sm font-black text-white shadow-[0_10px_22px_rgba(191,125,173,0.34)] transition hover:-translate-y-0.5 hover:bg-alibi-blue disabled:translate-y-0 disabled:opacity-55"
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                    stop
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStart}
                    disabled={isPending || loading}
                    className="alibi-button-primary inline-flex h-11 min-w-32 items-center justify-center gap-2 text-sm"
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    start
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setLoading(true);
                    loadTracker().finally(() => setLoading(false));
                  }}
                  disabled={isPending || loading}
                  aria-label="refresh timer and blocks"
                  title="refresh"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-alibi-lavender/40 bg-white/75 text-alibi-teal transition hover:-translate-y-0.5 hover:border-alibi-pink hover:text-alibi-pink disabled:translate-y-0 disabled:opacity-55"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </button>
              </div>

              <p className="relative mt-4 text-sm font-medium leading-6 text-alibi-teal">
                {activeTimer
                  ? `running since ${formatTime(activeTimer.started_at)}`
                  : "start when you begin, stop when the block is real."}
              </p>
            </section>

            {error && (
              <div
                role="alert"
                className="rounded-2xl border-2 border-alibi-pink/25 bg-alibi-pink/10 px-4 py-3 text-sm font-semibold text-alibi-pink"
              >
                {error}
              </div>
            )}

            {editor && (
              <BlockEditor
                editor={editor}
                setEditor={setEditor}
                onSave={handleSave}
                onDelete={
                  editor.block ? () => handleDelete(editor.block!) : undefined
                }
                pending={isPending}
              />
            )}

            <CoachChatPanel
              messages={chatMessages}
              pending={isChatPending}
              hasDraft={hasPendingDraft}
              onSubmit={handleCoachMessage}
            />
          </div>

          <DailyBlocks
            date={today.start}
            loading={loading}
            blocks={timeBlocks}
            canResume={activeTimer === null}
            onAdd={() => setEditor(createManualEditorState())}
            onEdit={(block) => setEditor(createEditorState(block))}
            onDelete={handleDelete}
            onResume={handleResume}
            pending={isPending}
          />
        </section>
      </div>
    </main>
  );
}

function CoachChatPanel({
  messages,
  pending,
  hasDraft,
  onSubmit,
}: {
  messages: ChatMessage[];
  pending: boolean;
  hasDraft: boolean;
  onSubmit: (text: string) => Promise<void>;
}) {
  const [value, setValue] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmed = value.trim();
    if (!trimmed || pending) {
      return;
    }

    setValue("");
    void onSubmit(trimmed);
  };

  return (
    <section className="alibi-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-xs font-black uppercase tracking-[0.12em] text-alibi-teal">
            alibi
          </p>
          <h2 className="mt-1 text-xl font-black text-alibi-blue">chat log</h2>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-alibi-pink/15 text-alibi-pink">
          <MessageCircle className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-4 flex max-h-80 min-h-44 flex-col gap-3 overflow-y-auto rounded-3xl border-2 border-alibi-lavender/25 bg-alibi-lavender/10 p-3">
        {messages.length === 0 ? (
          <p className="mt-auto text-sm font-semibold leading-6 text-alibi-teal">
            nothing here yet.
          </p>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "max-w-[88%] break-words rounded-2xl px-3 py-2 text-sm font-semibold leading-6 shadow-sm",
                message.role === "user"
                  ? "ml-auto bg-alibi-blue text-white"
                  : "mr-auto bg-white/85 text-alibi-ink",
              )}
            >
              {message.text}
            </div>
          ))
        )}
        {pending && (
          <div className="mr-auto inline-flex items-center gap-2 rounded-2xl bg-white/85 px-3 py-2 text-sm font-semibold text-alibi-teal">
            <Loader2 className="h-4 w-4 animate-spin" />
            thinking.
          </div>
        )}
      </div>

      {hasDraft && (
        <p className="mt-3 text-sm font-bold leading-6 text-alibi-pink">
          one more detail.
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-4 flex items-end gap-2">
        <label className="sr-only" htmlFor="coach-message">
          message alibi
        </label>
        <textarea
          id="coach-message"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          rows={2}
          disabled={pending}
          placeholder="message alibi"
          className="alibi-input min-h-11 flex-1 resize-none py-2 leading-6 placeholder:text-alibi-teal/60 disabled:opacity-55"
        />
        <button
          type="submit"
          disabled={!value.trim() || pending}
          aria-label="send message"
          title="send"
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-alibi-teal text-white shadow-[0_10px_22px_rgba(67,132,157,0.28)] transition hover:-translate-y-0.5 hover:bg-alibi-pink disabled:translate-y-0 disabled:opacity-55"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </form>
    </section>
  );
}

function BlockEditor({
  editor,
  setEditor,
  onSave,
  onDelete,
  pending,
}: {
  editor: EditorState;
  setEditor: (editor: EditorState | null) => void;
  onSave: () => void;
  onDelete?: () => void;
  pending: boolean;
}) {
  return (
    <section className="alibi-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-xs font-black uppercase tracking-[0.12em] text-alibi-teal">
            block editor
          </p>
          <h2 className="mt-1 text-xl font-black text-alibi-blue">
            {editor.isNewlyStopped
              ? "name this block"
              : editor.isManual
                ? "add block"
                : "edit block"}
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setEditor(null)}
          aria-label="close editor"
          title="close"
          className="flex h-9 w-9 items-center justify-center rounded-2xl text-alibi-teal transition hover:-translate-y-0.5 hover:bg-alibi-pink/15 hover:text-alibi-pink"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-5 grid gap-4">
        <label className="grid gap-1.5 text-sm font-bold text-alibi-blue">
          task name
          <input
            value={editor.taskName}
            onChange={(event) =>
              setEditor({ ...editor, taskName: event.target.value })
            }
            className="alibi-input h-11"
            placeholder="what happened?"
          />
        </label>

        <label className="grid gap-1.5 text-sm font-bold text-alibi-blue">
          category
          <select
            value={editor.category}
            onChange={(event) =>
              setEditor({
                ...editor,
                category: event.target.value as TimeBlockCategory | "",
              })
            }
            className="alibi-input h-11"
          >
            <option value="">choose one</option>
            {CATEGORIES.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-bold text-alibi-blue">
            start
            <input
              type="datetime-local"
              value={editor.startedAt}
              onChange={(event) =>
                setEditor({ ...editor, startedAt: event.target.value })
              }
              className="alibi-input h-11"
            />
          </label>

          <label className="grid gap-1.5 text-sm font-bold text-alibi-blue">
            end
            <input
              type="datetime-local"
              value={editor.endedAt}
              onChange={(event) =>
                setEditor({ ...editor, endedAt: event.target.value })
              }
              className="alibi-input h-11"
            />
          </label>
        </div>

        <label className="grid gap-1.5 text-sm font-bold text-alibi-blue">
          hashtags
          <input
            value={editor.hashtags}
            onChange={(event) =>
              setEditor({ ...editor, hashtags: event.target.value })
            }
            className="alibi-input h-11"
            placeholder="client, writing, reset"
          />
        </label>

        <label className="grid gap-1.5 text-sm font-bold text-alibi-blue">
          notes
          <textarea
            value={editor.notes}
            onChange={(event) =>
              setEditor({ ...editor, notes: event.target.value })
            }
            className="alibi-input min-h-24 resize-y py-2"
          />
        </label>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        {onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl px-3 text-sm font-bold text-alibi-pink transition hover:-translate-y-0.5 hover:bg-alibi-pink/10 disabled:translate-y-0 disabled:opacity-55"
          >
            <Trash2 className="h-4 w-4" />
            delete
          </button>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEditor(null)}
            disabled={pending}
            className="h-10 rounded-2xl px-4 text-sm font-bold text-alibi-teal transition hover:-translate-y-0.5 hover:bg-alibi-lavender/15 disabled:translate-y-0 disabled:opacity-55"
          >
            cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={pending}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-alibi-teal px-4 text-sm font-black text-white shadow-[0_10px_22px_rgba(67,132,157,0.28)] transition hover:-translate-y-0.5 hover:bg-alibi-blue disabled:translate-y-0 disabled:opacity-55"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            save
          </button>
        </div>
      </div>
    </section>
  );
}

function DailyBlocks({
  date,
  loading,
  blocks,
  canResume,
  onAdd,
  onEdit,
  onDelete,
  onResume,
  pending,
}: {
  date: Date;
  loading: boolean;
  blocks: TimeBlock[];
  canResume: boolean;
  onAdd: () => void;
  onEdit: (block: TimeBlock) => void;
  onDelete: (block: TimeBlock) => void;
  onResume: (block: TimeBlock) => void;
  pending: boolean;
}) {
  return (
    <section className="alibi-card min-h-[520px] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-xs font-black uppercase tracking-[0.12em] text-alibi-teal">
            today
          </p>
          <h2 className="mt-1 text-2xl font-black text-alibi-blue">
            {formatDateHeading(date)}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onAdd}
            disabled={pending}
            aria-label="add completed block"
            title="add block"
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-alibi-teal text-white shadow-[0_10px_22px_rgba(67,132,157,0.22)] transition hover:-translate-y-0.5 hover:bg-alibi-blue disabled:translate-y-0 disabled:opacity-55"
          >
            <Plus className="h-4 w-4" />
          </button>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-alibi-lavender/25 text-alibi-blue">
            <CalendarDays className="h-4 w-4" />
          </div>
        </div>
      </div>

      <div className="mt-5">
        {loading ? (
          <div className="flex min-h-72 items-center justify-center text-alibi-teal">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : blocks.length === 0 ? (
          <div className="flex min-h-72 items-center justify-center rounded-3xl border-2 border-dashed border-alibi-lavender/60 bg-alibi-lavender/10 px-6 text-center text-sm font-semibold leading-6 text-alibi-teal">
            no completed blocks for today yet.
          </div>
        ) : (
          <ol className="grid gap-3">
            {blocks.map((block, index) => {
              const category = getCategoryMeta(block.category);
              const isLatestBlock = index === blocks.length - 1;

              return (
                <li
                  key={block.id}
                  className="grid gap-3 rounded-3xl border-2 border-alibi-lavender/25 bg-white/80 p-4 shadow-[0_10px_24px_rgba(50,83,199,0.09)] transition hover:-translate-y-0.5 hover:border-alibi-pink/35 sm:grid-cols-[7.5rem_minmax(0,1fr)_auto]"
                >
                  <div className="font-mono text-sm font-semibold leading-6 text-alibi-teal">
                    <div>{formatTime(block.started_at)}</div>
                    <div>{formatTime(block.ended_at)}</div>
                    <div className="mt-1 font-sans text-sm font-black text-alibi-blue">
                      {formatDuration(
                        block.duration_seconds,
                        block.started_at,
                        block.ended_at,
                      )}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="text-sm font-black uppercase tracking-[0.08em] text-alibi-teal">
                        {category.label}
                      </span>
                    </div>
                    <h3 className="mt-2 break-words text-base font-black text-alibi-ink">
                      {block.task_name || "unnamed time block"}
                    </h3>
                    {block.notes && (
                      <p className="mt-1 break-words text-sm font-medium leading-6 text-alibi-teal">
                        {block.notes}
                      </p>
                    )}
                    {block.hashtags && block.hashtags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {block.hashtags.map((hashtag) => (
                          <span key={hashtag} className="alibi-chip">
                            #{hashtag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-start gap-1">
                    {isLatestBlock && (
                      <button
                        type="button"
                        onClick={() => onResume(block)}
                        disabled={pending || !canResume}
                        aria-label="resume latest block"
                        title="resume"
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-2xl bg-alibi-teal px-3 text-xs font-black text-white shadow-[0_8px_18px_rgba(67,132,157,0.22)] transition hover:-translate-y-0.5 hover:bg-alibi-blue disabled:translate-y-0 disabled:opacity-55"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        resume
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onEdit(block)}
                      aria-label="edit block"
                      title="edit"
                      className="flex h-9 w-9 items-center justify-center rounded-2xl text-alibi-teal transition hover:-translate-y-0.5 hover:bg-alibi-lavender/20 hover:text-alibi-blue"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(block)}
                      disabled={pending}
                      aria-label="delete block"
                      title="delete"
                      className="flex h-9 w-9 items-center justify-center rounded-2xl text-alibi-pink transition hover:-translate-y-0.5 hover:bg-alibi-pink/10 disabled:translate-y-0 disabled:opacity-55"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}
