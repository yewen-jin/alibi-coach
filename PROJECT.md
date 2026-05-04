# Alibi — Project

> Source of truth for the product vision: [`SPECS.md`](./SPECS.md).
> This file documents what we're actually building, how it's structured, and what's done.

## One-line objective

> **Alibi is the friend who remembers your day, so you don't have to defend it to yourself.**

Not a planner. Not a tracker. A witness with a warm voice.

The current product centers on a timer-first block tracker, with chat reintroduced as a secondary agentic input surface. Timer UI and chat both read/write `active_timer` and `time_blocks`; `entries` is legacy-only. V3 is now moving the product toward a notes-first insight engine: `time_blocks.notes` stays the human-authored source of truth, while derived insight tables preserve note history and extract lightweight patterns.

---

## SPECS.md v2/V3 transition status

`SPECS.md` now documents the v2 timer/chat foundation plus the V3 notes-first insight layer. The authenticated `/app` route runs the timer, time-block flow, block editor, and chat agent while older v1 receipt/chat components remain in the codebase for reference.

Server action status from the v2 architecture:

| Function | Status |
| --- | --- |
| `getActiveTimer` | Implemented in `app/actions/timer.ts`; loads the current user's `active_timer` row so the Phase 1 timer UI can hydrate after refresh/navigation. |
| `startTimer` | Implemented in `app/actions/timer.ts`; creates the current user's `active_timer` row and preserves an already-running timer. |
| `resumeBlock` | Implemented in `app/actions/timer.ts`; reopens the latest completed block into `active_timer` from its original start time while preserving block metadata. |
| `stopTimer` | Implemented in `app/actions/timer.ts`; moves the current user's `active_timer` into `time_blocks` and clears the active timer. Stopped blocks intentionally have no metadata until the block editor exists. |
| `saveBlock` | Implemented in `app/actions/timer.ts`; creates manual/backdated blocks when `id` is absent, saves post-stop metadata edits for user-owned `time_blocks`, preserves meaningful note edits, and stores note-derived insights when notes exist. |
| `deleteBlock` | Implemented in `app/actions/timer.ts`; deletes user-owned `time_blocks` rows and returns `not_found` for missing or non-owned blocks. |
| `getCalendarData` | Implemented in `app/actions/timer.ts`; loads completed user-owned `time_blocks` that overlap the requested date range. |
| `getCategories` / `createCategory` | Implemented in `app/actions/timer.ts`; loads default plus user-owned categories and creates user categories from editor/chat category names. |
| `processCoachMessage` | Implemented in `app/actions/process-message.ts`; routes chat into conversational coaching, timer start/stop, completed-block logging, clarification, and analysis over `time_blocks`. Completed-block chat writes require clear log intent plus time, task, and explicit or confidently inferred category. |

Database setup: v2 tables are installed in Supabase and verified through REST schema access. `active_timer`, `time_blocks`, `entries`, and `proactive_messages` all return `200` from the project REST API. The V3 schema additions are present in `supabase-v2.sql` and must be applied to hosted databases: `time_block_categories`, `time_block_note_versions`, `time_block_insights`, `time_blocks.category_id`, and `time_blocks.agent_metadata`. The existing `entries`/v1 schema remains intact.

Where we are now:

- **Database foundation:** v2 tables are live; V3 migration SQL is written but hosted databases still need the new category, note-version, and note-insight tables/columns applied where they are not already present.
- **Server foundation:** active timer hydration, timer start/stop/resume, manual block save/update/delete, custom category creation, chat-controlled writes, clarification gating, calendar range reads, note-version preservation, and note-derived insight upserts exist for `time_blocks`.
- **UI foundation:** `/app` renders a persistent timer control, post-stop/manual block editor, daily add-block button, latest-block resume button, chat panel, and simple daily time-block list. The editor now frames notes as “what really happened” and lets users type a new category name while logging.
- **Dashboard progress:** `/app/dashboard` renders totals, calendar/rhythm/category views, ADHD markers, and a V3 notes mirror. ADHD marker counts now merge explicit block booleans with note-derived insight signals so older derived rows are visible without SQL backfill.
- **Chat progress:** implemented as a secondary input surface. It can respond conversationally without forcing a log, start a timer, stop a timer into `time_blocks`, log completed blocks with extracted metadata, ask for missing timing/task/category before writes, create/use custom categories from category names, and answer from saved blocks. Analysis now prioritizes notes, then block metadata, then note-derived insights, then linked chat. New chat writes no longer go to `entries`.
- **Public/docs copy:** `/` and `/app/docs` still mainly describe the v2 product shape; deeper V3 notes-first copy is documented in `SPECS.md` and should be reflected in app-facing docs later.
- **Verification:** `npm run build` passes after the notes-first dashboard and analysis updates. Live Supabase/OpenRouter flows still need browser QA with an authenticated user after applying the hosted database migration.
- **Next implementation step:** apply/verify the V3 database migration in the hosted database, run live note-save and dashboard smoke tests, then broaden analysis beyond today into explicit week/month summaries.
- **Later server gap:** broader period analysis is still basic; the analysis path supports extracted ranges but needs richer week/month handling and deterministic longitudinal summaries.

---

## The four moments (mapped to the build)

The spec defines four user moments. Here's where each one lives in the codebase.

### 1. The chat log — log anything with structure

User can talk normally. Alibi responds as a conversational coach unless the message clearly intends to save completed work. When the user does log something, Alibi parses it into v2 time-block fields, asks for missing timing/task/category before writing, saves one `time_blocks` row, and replies with one warm phrase ("on the record.", "got it.", "noted.").

- **UI:** [`components/timer-tracker-app.tsx`](./components/timer-tracker-app.tsx) — chat panel beside the timer/list experience.
- **AI:** [`app/actions/process-message.ts`](./app/actions/process-message.ts) — routes intent, handles `coach_chat`, extracts time-block metadata for clear log attempts, clarifies missing timing/task/category, executes v2 writes, and generates a warm one-liner ack.
- **Display:** [`components/ack-toast.tsx`](./components/ack-toast.tsx) — a soft fade-in/fade-out italic line, no celebratory tone.
- **Storage:** `time_blocks` table, RLS scoped to `auth.uid()`.

### 2. The check-in — guilt-spiral mode

User types something like *"i feel like i did nothing today"* or *"what did i do today?"* Alibi switches mode automatically — no separate button, no toggle. It pulls today's `time_blocks`, prioritizes block notes as the strongest evidence, and reads the day back to the user with warmth.

- **Detection:** Same AI call classifies `intent: "analyse_blocks"`.
- **Reflection:** Same server action pulls today's completed `time_blocks` and prompts the model to reflect them back. Hard system rules forbid toxic positivity, exclamation marks, breathing exercises, or productivity lectures. Lowercase, conversational, under 90 words.
- **UI:** [`components/coach-response.tsx`](./components/coach-response.tsx) — a calm, dismissible reflection card.

### 3. The receipt — end-of-day card

A screenshot-friendly summary of today: counts, tracked time, project pills, timestamped list. No ratings, no stars, no performance.

- **UI:** [`components/daily-receipt.tsx`](./components/daily-receipt.tsx) — toggleable from the main view.
- **Footer line:** *"this is your day. it counts."* — flat, not exclaimed.

### 4. The mirror — pattern reflection

Implemented as an initial V3 dashboard panel. It surfaces gentle note-derived observations with a small evidence trail, without scores or rankings.

- **UI:** [`components/dashboard/notes-mirror.tsx`](./components/dashboard/notes-mirror.tsx) — reads `time_block_insights` and shows friction, hyperfocus/flow, satisfaction, and emotional-tone observations with note excerpts.
- **Storage:** `time_block_insights` stores derived interpretations; `time_block_note_versions` preserves meaningful note edits.
- **Status:** first vertical slice implemented. Longitudinal observations across weeks/months remain future work.

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
| `category`         | text          | category slug, default or user-created |
| `category_id`      | uuid          | optional FK to `time_block_categories` |
| `hashtags`         | text[]        | optional context tags          |
| `notes`            | text          | optional but primary reflection evidence: what happened, friction, feeling, changes, and noticed context |
| `mood`             | text          | AI-extracted, nullable         |
| `effort_level`     | text          | AI-extracted, nullable         |
| `satisfaction`     | text          | AI-extracted, nullable         |
| `avoidance_marker` | boolean       | explicit or note-derived marker |
| `hyperfocus_marker` | boolean      | explicit or note-derived marker |
| `guilt_marker`     | boolean       | explicit or note-derived marker |
| `novelty_marker`   | boolean       | explicit marker                |

`public.time_block_categories`:

| column       | type        | note                                  |
| ------------ | ----------- | ------------------------------------- |
| `id`         | uuid pk     | category id                           |
| `user_id`    | uuid/null   | null for defaults, user id for custom |
| `slug`       | text        | stable category key                   |
| `name`       | text        | display label                         |
| `color`      | text        | hex color                             |
| `is_default` | boolean     | default category marker               |
| `agent_metadata`   | jsonb         | derived context only           |
| `created_at`       | timestamptz   | default `now()`                |

RLS: each user can only `select / insert / update / delete` their own rows.

Additional V3 tables:

- `time_block_note_versions` preserves every meaningful note change with `previous_notes`, `new_notes`, and `source`.
- `time_block_insights` stores derived note interpretations such as friction, avoidance, hyperfocus, satisfaction, uncertainty, people/projects/themes, and evidence excerpts.

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
  note-insights.ts             # note-derived insight extraction and prompt formatting
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
6. **Tap the plus button in today's blocks.** The editor opens with start set to 30 minutes ago and end set to now; saving with task/category creates one completed `time_blocks` row.
7. **Type:** *"worked on gallery meeting from 2 to 2:45, social"* → another completed `time_blocks` row appears.
8. **Type:** *"worked on something"* → chat stores a draft and asks for timing before writing.
9. **Type:** *"i feel like i did nothing today"* → chat reflects the saved `time_blocks` back with specifics.

That's the core demo. No accounts step, no settings, no scores.

---

## Closing pitch line

> *Todo lists are glass half empty. Done lists are glass half full. Alibi is the friend who proves the glass was fuller than you thought.*
