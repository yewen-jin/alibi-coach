# Alibi — Project

> Source of truth for the product vision: [`SPECS.md`](./SPECS.md).
> This file documents what we're actually building, how it's structured, and what's done.

## One-line objective

> **Alibi is the friend who remembers your day, so you don't have to defend it to yourself.**

Not a planner. Not a tracker. A witness with a warm voice.

The whole product is one input box, one list, one receipt — and an AI that knows when you're logging vs. spiralling and responds accordingly.

---

## SPECS.md v2 transition status

`SPECS.md` is now v2 and supersedes parts of the older v1 implementation notes below. The current app still mostly runs the v1 drop-in/chat flow while v2 timer and calendar functionality is being added.

Server action status from the v2 architecture:

| Function | Status |
| --- | --- |
| `startTimer` | Implemented in `app/actions/timer.ts`; creates the current user's `active_timer` row and preserves an already-running timer. |
| `stopTimer` | Implemented in `app/actions/timer.ts`; moves the current user's `active_timer` into `time_blocks` and clears the active timer. Stopped blocks intentionally have no metadata until the block editor exists. |
| `saveBlock` | Implemented in `app/actions/timer.ts`; creates manual/backdated blocks and saves post-stop metadata edits for user-owned `time_blocks`. |
| `deleteBlock` | Implemented in `app/actions/timer.ts`; deletes user-owned `time_blocks` rows and returns `not_found` for missing or non-owned blocks. |
| `getCalendarData` | Not implemented. |
| `analyseBlocks` | Not implemented. |

Database assumption: `active_timer` and `time_blocks` exist in Supabase with the shapes defined in `SPECS.md`.

---

## The four moments (mapped to the build)

The spec defines four user moments. Here's where each one lives in the codebase.

### 1. The drop-in — log anything, any way

User types or speaks anything they did. Alibi parses it silently (project, mood, rough duration), files it, and replies with one warm phrase ("on the record.", "got it.", "noted.").

- **UI:** [`components/entry-input.tsx`](./components/entry-input.tsx) — single textarea + voice + send button. Placeholder: *"how's it going?"*
- **AI:** [`app/actions/process-message.ts`](./app/actions/process-message.ts) — classifies the message, extracts metadata via `Output.object()`, generates a warm one-liner ack.
- **Display:** [`components/ack-toast.tsx`](./components/ack-toast.tsx) — a soft fade-in/fade-out italic line, no celebratory tone.
- **Storage:** `entries` table, RLS scoped to `auth.uid()`.

### 2. The check-in — guilt-spiral mode

User types something like *"i feel like i did nothing today"* or *"why am i like this."* Alibi switches mode automatically — no separate button, no toggle. It pulls today's entries and reads the day back to the user, with warmth, using their actual logged evidence.

- **Detection:** Same AI call as drop-in classifies `intent: "check_in"`.
- **Reflection:** Same server action pulls today's entries and prompts the model to reflect them back. Hard system rules forbid toxic positivity, exclamation marks, breathing exercises, or productivity lectures. Lowercase, conversational, under 80 words.
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
- ❌ Timers (decide-to-track-before-doing is the exact ADHD failure mode)
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
- **AI:** Vercel AI SDK 6 via the AI Gateway, model `openai/gpt-5-mini`
- **Styling:** Tailwind v4 with custom warm palette + Lora (serif) / Nunito (sans) fonts
- **Voice input:** Web Speech API (client-side, no server transcription)

### Database schema

`public.entries`:

| column             | type          | note                           |
| ------------------ | ------------- | ------------------------------ |
| `id`               | uuid pk       | `gen_random_uuid()`            |
| `user_id`          | uuid          | FK → `auth.users`, cascade     |
| `content`          | text          | the cleaned-up entry text      |
| `project`          | text          | AI-extracted, nullable         |
| `mood`             | text          | AI-extracted, nullable         |
| `duration_minutes` | integer       | AI-extracted, nullable         |
| `created_at`       | timestamptz   | default `now()`                |

RLS: each user can only `select / insert / update / delete` their own rows.

### Key files

```
app/
  actions/process-message.ts   # the brain: classify → save or reflect
  auth/                        # Supabase email/password auth
  page.tsx                     # auth gate + initial entries
  layout.tsx                   # fonts, metadata, theme
  globals.css                  # warm palette + coach-mode tokens
components/
  done-list-app.tsx            # main client app shell
  entry-input.tsx              # the only input the user sees
  entry-list.tsx               # grouped-by-day list with project pills
  coach-response.tsx           # check-in reflection card
  ack-toast.tsx                # drop-in warm ack
  daily-receipt.tsx            # screenshot-friendly card
  header.tsx                   # alibi · the friend who remembers your day
lib/
  supabase/{client,server,middleware}.ts
  types.ts                     # Entry type
middleware.ts                  # session refresh + protected routes
```

---

## Demo flow (90 seconds, from the spec)

1. **Open the app.** Calm interface, *"how's it going?"* placeholder.
2. **Type:** *"spent 2 hours debugging socket stuff for cinecircle"* → entry appears with the `cinecircle` pill and `~2h` tag, ack reads *"on the record."*
3. **Voice:** *"had a meeting with the gallery"* → entry appears, ack reads *"got it."*
4. **Type:** *"i feel like i did nothing today"* → check-in mode kicks in: a warm reflection that names the socket bug and the gallery meeting.
5. **Tap "show today's receipt"** → screenshot-able card appears.

That's the whole demo. No accounts step, no settings, no patterns view.

---

## Closing pitch line

> *Todo lists are glass half empty. Done lists are glass half full. Alibi is the friend who proves the glass was fuller than you thought.*
