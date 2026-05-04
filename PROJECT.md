# Alibi — Project

> Source of truth for the product vision: [`SPECS.md`](./SPECS.md).
> This file documents what we're actually building, how it's structured, and what's done.

## One-line objective

> **Alibi is the friend who remembers your day, so you don't have to defend it to yourself.**

Not a planner. Not a tracker. A witness with a warm voice.

The current v2 product centers on a timer-first block tracker, with chat reintroduced as a secondary agentic input surface. Timer UI and chat both read/write `active_timer` and `time_blocks`; `entries` is legacy-only.

---

## SPECS.md v2 transition status

`SPECS.md` is now v2 and supersedes parts of the older v1 implementation notes below. The authenticated `/app` route now runs the v2 timer, time-block flow, and chat agent while older v1 receipt/chat components remain in the codebase for reference.

Server action status from the v2 architecture:

| Function | Status |
| --- | --- |
| `getActiveTimer` | Implemented in `app/actions/timer.ts`; loads the current user's `active_timer` row so the Phase 1 timer UI can hydrate after refresh/navigation. |
| `startTimer` | Implemented in `app/actions/timer.ts`; creates the current user's `active_timer` row and preserves an already-running timer. |
| `resumeBlock` | Implemented in `app/actions/timer.ts`; reopens the latest completed block into `active_timer` from its original start time while preserving block metadata. |
| `stopTimer` | Implemented in `app/actions/timer.ts`; moves the current user's `active_timer` into `time_blocks` and clears the active timer. Stopped blocks intentionally have no metadata until the block editor exists. |
| `saveBlock` | Implemented in `app/actions/timer.ts`; creates manual/backdated blocks and saves post-stop metadata edits for user-owned `time_blocks`. |
| `deleteBlock` | Implemented in `app/actions/timer.ts`; deletes user-owned `time_blocks` rows and returns `not_found` for missing or non-owned blocks. |
| `getCalendarData` | Implemented in `app/actions/timer.ts`; loads completed user-owned `time_blocks` that overlap the requested date range. |
| `processCoachMessage` | Implemented in `app/actions/process-message.ts`; routes chat into timer start/stop, completed-block logging, clarification, and analysis over `time_blocks`. |

Database setup: v2 tables are installed in Supabase and verified through REST schema access. `active_timer`, `time_blocks`, `entries`, and `proactive_messages` all return `200` from the project REST API. The existing `entries`/v1 schema remains intact.

Where we are now:

- **Database foundation:** complete for Phase 1 readiness. `active_timer` and `time_blocks` exist in Supabase with the v2 shape; app-data wipe/fresh-start status has not been independently verified from the repo because RLS hides user-owned rows from the anon key.
- **Server foundation:** complete for Phase 1 plus first chat-agent pass. Active timer hydration, timer start/stop/resume, manual block save/update/delete, chat-controlled writes, clarification gating, and calendar range reads exist for `time_blocks`.
- **UI foundation:** partially complete for v2. `/app` now renders a persistent timer control, post-stop/manual block editor, latest-block resume button, chat panel, and simple daily time-block list backed by the same server actions.
- **Chat progress:** implemented as a secondary input surface. It can start a timer, stop a timer into `time_blocks`, log completed blocks with extracted metadata, ask for missing timing/task/category before writes, and answer from saved blocks. New chat writes no longer go to `entries`.
- **Verification:** `npm run build` passes after the chat reintroduction. Live Supabase/OpenRouter flows still need browser QA with an authenticated user.
- **Next implementation step:** run live chat/manual-block smoke tests, then broaden the calendar experience beyond today's list.
- **Later server gap:** broader period analysis is still basic; the first chat analysis path supports extracted ranges but needs richer week/month handling and deterministic summaries.

---

## The four moments (mapped to the build)

The spec defines four user moments. Here's where each one lives in the codebase.

### 1. The chat log — log anything with structure

User types anything they did. Alibi parses it into v2 time-block fields, asks for missing timing before writing, saves one `time_blocks` row, and replies with one warm phrase ("on the record.", "got it.", "noted.").

- **UI:** [`components/timer-tracker-app.tsx`](./components/timer-tracker-app.tsx) — chat panel beside the timer/list experience.
- **AI:** [`app/actions/process-message.ts`](./app/actions/process-message.ts) — routes intent, extracts time-block metadata, clarifies missing timing, executes v2 writes, and generates a warm one-liner ack.
- **Display:** [`components/ack-toast.tsx`](./components/ack-toast.tsx) — a soft fade-in/fade-out italic line, no celebratory tone.
- **Storage:** `time_blocks` table, RLS scoped to `auth.uid()`.

### 2. The check-in — guilt-spiral mode

User types something like *"i feel like i did nothing today"* or *"what did i do today?"* Alibi switches mode automatically — no separate button, no toggle. It pulls today's `time_blocks` and reads the day back to the user, with warmth, using their actual logged evidence.

- **Detection:** Same AI call classifies `intent: "analyse_blocks"`.
- **Reflection:** Same server action pulls today's completed `time_blocks` and prompts the model to reflect them back. Hard system rules forbid toxic positivity, exclamation marks, breathing exercises, or productivity lectures. Lowercase, conversational, under 90 words.
- **UI:** [`components/coach-response.tsx`](./components/coach-response.tsx) — a calm, dismissible reflection card.

### 3. The receipt — end-of-day card

A screenshot-friendly summary of today: counts, tracked time, project pills, timestamped list. No ratings, no stars, no performance.

- **UI:** [`components/daily-receipt.tsx`](./components/daily-receipt.tsx) — toggleable from the main view.
- **Footer line:** *"this is your day. it counts."* — flat, not exclaimed.

### 4. The mirror — pattern reflection (v1.1, not built)

Roadmap. Will surface gentle longitudinal patterns ("you're most productive 11am–2pm", "you log least on Sundays") without grading the user.

- **Status:** not implemented. Schema already captures `created_at`, `project`, `mood`, `duration_minutes`, which is enough to power this later.

---

## What we explicitly are NOT building

Pulled from the spec — these are guardrails for every future change:

- ❌ Todos / planning / goal-setting
- ❌ Timers that demand task planning before action (the v2 timer starts first; metadata comes after)
- ❌ Push notifications nagging the user
- ❌ Streaks, scores, ratings, or comparison
- ❌ Breathing exercises, journaling prompts, "wellness techniques"
- ❌ Toxic positivity, exclamation-mark cheerleading
- ❌ A productivity dashboard

If a feature pushes the user, it doesn't ship.

---

## Architecture

### Stack

- **Framework:** Next.js 15 App Router
- **Auth + DB:** Supabase (RLS-protected)
- **AI:** Vercel AI SDK 6 through OpenRouter (`lib/ai.ts`)
- **Styling:** Tailwind v4 with custom warm palette + Lora (serif) / Nunito (sans) fonts
- **Voice input:** Web Speech API (client-side, no server transcription)

### Database schema

`public.time_blocks`:

| column             | type          | note                           |
| ------------------ | ------------- | ------------------------------ |
| `id`               | uuid pk       | `gen_random_uuid()`            |
| `user_id`          | uuid          | FK → `auth.users`, cascade     |
| `started_at`       | timestamptz   | block start                    |
| `ended_at`         | timestamptz   | block end, nullable while running |
| `duration_seconds` | integer       | generated from start/end       |
| `task_name`        | text          | short block label              |
| `category`         | text          | v2 category enum               |
| `hashtags`         | text[]        | optional context tags          |
| `notes`            | text          | optional context               |
| `mood`             | text          | AI-extracted, nullable         |
| `effort_level`     | text          | AI-extracted, nullable         |
| `satisfaction`     | text          | AI-extracted, nullable         |
| `created_at`       | timestamptz   | default `now()`                |

RLS: each user can only `select / insert / update / delete` their own rows.

### Key files

```
app/
  actions/process-message.ts   # chat router: classify → clarify/write/analyse
  actions/timer.ts             # v2 active_timer + time_blocks actions
  auth/                        # Supabase email/password auth
  app/page.tsx                 # auth gate + v2 tracker
  layout.tsx                   # fonts, metadata, theme
  globals.css                  # warm palette + coach-mode tokens
components/
  timer-tracker-app.tsx        # main v2 app shell: timer, editor, list, chat
  top-nav.tsx                  # authenticated navigation
  dashboard/*                  # dashboard summaries over time_blocks
lib/
  supabase/{client,server,middleware}.ts
  types.ts                     # time-block, timer, and legacy entry types
middleware.ts                  # session refresh + protected routes
```

---

## Demo flow (90 seconds, from the spec)

1. **Open `/app`.** Calm timer-first interface, today's blocks visible.
2. **Tap start.** One `active_timer` row is created.
3. **Type:** *"stop timer, socket bug, coding"* → one `time_blocks` row is created and appears in today's list.
4. **Tap resume on the latest block.** That block reopens from its original start time, keeps its metadata, and disappears from the completed list while running.
5. **Tap stop.** The same `time_blocks` row is completed again with the extended end time.
6. **Type:** *"worked on gallery meeting from 2 to 2:45, social"* → another completed `time_blocks` row appears.
7. **Type:** *"i feel like i did nothing today"* → chat reflects the saved `time_blocks` back with specifics.

That's the core demo. No accounts step, no settings, no scores.

---

## Closing pitch line

> *Todo lists are glass half empty. Done lists are glass half full. Alibi is the friend who proves the glass was fuller than you thought.*
