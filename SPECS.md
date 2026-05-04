# Alibi — Product Spec v2

## The core promise

> *Alibi is the friend who remembers your day, so you don't have to defend it to yourself.*

Not a planner. Not a productivity tool. **A witness — with precision.**

---

## What changed in v2

The original spec used a freeform chat as the primary input mechanism. That created two problems:

1. **The AI gave generic responses** — without structured input, the model had nothing specific to work with.
2. **Users lost control** — drop-in logging is frictionless but opaque. You couldn't see, edit, or browse your time meaningfully.

**The new direction:**

- **Primary input: time blocks** — you start a timer, stop it, and a block is recorded. You control what gets logged.
- **Primary interface: calendar** — the calendar is the main view, not the chat.
- **Chat is a secondary input surface** — the AI can start/stop the timer, log completed blocks, ask clarifying questions, and analyse saved blocks. It writes to the same v2 tables as the timer UI.

---

## The user (unchanged)

You have ADHD. You hyperfocus. You lose hours to deep work and forget you did it. You miss other things. By 7pm you feel like you accomplished nothing — even when you accomplished plenty.

The problem isn't *what you did*. It's that you have **no record of it** and your brain refuses to remember.

---

## The four interfaces

### 1. The timer (primary input)

A persistent timer control — always visible. One tap to start, one tap to stop. When you stop, a block is saved with:

- Start time (exact)
- End time (exact)
- Duration (calculated)
- Task name (prompted after stopping — short, required)
- Category (one of: `deep_work | admin | social | errands | care | creative | rest`)
- Hashtags (optional, free text, e.g. `#cinecircle #coding`)
- Notes (optional, multi-line, for context or reflection)

The block is saved immediately. You can edit any field after the fact.

**Design principle:** Start and stop are zero-friction. The metadata is filled in *after* — ADHD-safe because the activation energy is already spent.

---

### 2. The calendar (primary dashboard)

The main view. Three levels of detail, switchable:

#### Monthly view
- Grid of days, current month.
- Each day cell shows: total hours logged, up to 3 category colour chips.
- Click a day to expand to daily view.
- Empty days are visible — not styled as failure, just neutral.

#### Weekly view
- 7-day horizontal strip.
- Each day column broken into time blocks, rendered as coloured bars at their actual position in the day (like Google Calendar).
- Block height proportional to duration.
- Click a block to see/edit details.

#### Daily view
- Full day timeline, hour-by-hour.
- Blocks rendered at their exact time position.
- Gap periods visible — untracked time is shown, not hidden.
- Click empty space to create a manual block (backdated).
- Click a block to edit task name, category, hashtags, notes.

**Colour system:**

| Category | Colour |
|---|---|
| deep_work | terracotta |
| admin | warm grey |
| social | sage green |
| errands | amber |
| care | soft blue |
| creative | lavender |
| rest | sand |

---

### 3. The block editor

A slide-in panel or modal. Fields:

- **Task name** — required, short
- **Category** — dropdown, one of the seven above
- **Hashtags** — free text, space or comma separated, stored as array
- **Notes** — multi-line, optional
- **Start / end time** — editable (for manual correction)
- **Delete block** — with confirmation

Blocks can be created manually (not just from the timer) for backdating things you forgot to track.

---

### 4. The chat agent (secondary input + analysis)

The AI coach lives in a side panel or separate route. It has read/write access to the v2 time-block model and can be used when natural language is lower-friction than the timer UI.

It can control the timer:
- *"start the timer"*
- *"stop the timer, client bug, coding"*

It can log completed blocks:
- *"worked on client bug from 2 to 3:30, coding"*
- *"finally sent the invoice, 20 minutes, admin"*

If the user tries to log completed work without a usable time window or duration, it asks a follow-up instead of guessing.

It answers questions like:
- *"What did I do today?"*
- *"How much time did I spend on deep work this week?"*
- *"When do I tend to hyperfocus?"*
- *"I feel like I did nothing — is that true?"*

The coach still uses the ADHD-informed reframing logic from RESEARCH.md:
- Retrieves actual blocks for the period in question.
- Reflects them back with warmth and specificity.
- Notes effort markers, avoidance patterns, hyperfocus sessions.
- Never says "you should". Never gives generic feedback.

**Why this is better:** The AI now always has structured, queryable data to work from. No more vague responses because vague input.

---

## What Alibi explicitly is *not*

| Not | Because |
|---|---|
| A planner | Planning is the friction. We removed it. |
| A to-do list | Tasks create expectation. We trade in evidence. |
| A goal-setter | Goals create comparison. We collect moments. |
| A coach who pushes | Push energy makes you avoid the app. |
| A productivity dashboard | Numbers create judgment. We surface self-knowledge. |
| A vague freeform-only chatbot | Chat may write, but only through structured `time_blocks` and `active_timer` operations. |

---

## Database schema (v2)

### `time_blocks` (new primary table)

Replaces `entries` as the main data store.

```sql
time_blocks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Core time data
  started_at        TIMESTAMPTZ NOT NULL,
  ended_at          TIMESTAMPTZ,                      -- NULL while timer is running
  duration_seconds  INTEGER GENERATED ALWAYS AS (
                      EXTRACT(EPOCH FROM (ended_at - started_at))
                    ) STORED,

  -- Block metadata
  task_name         TEXT,                             -- filled in after stopping
  category          TEXT,                             -- category slug; default or user-created
  category_id       UUID REFERENCES time_block_categories(id) ON DELETE SET NULL,
  hashtags          TEXT[],                           -- e.g. {'cinecircle','coding'}
  notes             TEXT,                             -- human-authored source of truth: what happened, what got in the way, how it felt

  -- ADHD affect layer (v1 parity — can be filled manually or by AI)
  mood              TEXT CHECK (mood IN (
                      'joyful','neutral','flat','anxious','guilty','proud'
                    )),
  effort_level      TEXT CHECK (effort_level IN ('easy','medium','hard','grind')),
  satisfaction      TEXT CHECK (satisfaction IN (
                      'satisfied','mixed','frustrated','unclear'
                    )),

  -- ADHD marker flags (set by analysis agent, not by user)
  avoidance_marker  BOOLEAN DEFAULT FALSE,
  hyperfocus_marker BOOLEAN DEFAULT FALSE,
  guilt_marker      BOOLEAN DEFAULT FALSE,
  novelty_marker    BOOLEAN DEFAULT FALSE,
  agent_metadata    JSONB DEFAULT '{}',               -- derived context only, never a replacement for notes

  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
)
```

### `time_block_categories` (v3)

Default categories remain available, but users can create their own categories while editing or chatting.

```sql
time_block_categories (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL for defaults
  slug              TEXT NOT NULL,
  name              TEXT NOT NULL,
  color             TEXT NOT NULL,
  is_default        BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
)
```

Notes are optional, but they are structurally important in v3. They are the first evidence source for insight work because they carry what really happened inside a dated block: actions, friction, feeling, context, changes, and what the user noticed. Category, hashtags, mood, effort, satisfaction, and markers are secondary metadata around that human-written note.

### `time_block_note_versions`

Preserves meaningful note edits so a user's changing interpretation of a block is not lost.

```sql
time_block_note_versions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  time_block_id     UUID REFERENCES time_blocks(id) ON DELETE CASCADE,
  user_id           UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  previous_notes    TEXT,
  new_notes         TEXT,
  source            TEXT CHECK (source IN ('manual','chat','agent')),
  created_at        TIMESTAMPTZ DEFAULT NOW()
)
```

### `time_block_insights`

Stores derived interpretations from notes. Raw notes remain the source of truth.

```sql
time_block_insights (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  time_block_id          UUID UNIQUE REFERENCES time_blocks(id) ON DELETE CASCADE,
  user_id                UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  source                 TEXT DEFAULT 'notes',
  actions                TEXT[],
  emotional_tone         TEXT,
  friction_points        TEXT[],
  avoidance_signals      TEXT[],
  hyperfocus_signals     TEXT[],
  satisfaction_signals   TEXT[],
  uncertainty_signals    TEXT[],
  people                 TEXT[],
  projects               TEXT[],
  themes                 TEXT[],
  evidence_excerpt       TEXT,
  model_version          TEXT,
  created_at             TIMESTAMPTZ DEFAULT NOW()
)
```

### `active_timer` (ephemeral state)

One row per user, replaces client-side timer state.

```sql
active_timer (
  user_id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at        TIMESTAMPTZ NOT NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW()
)
```

### `proactive_messages` (unchanged)

```sql
proactive_messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content           TEXT NOT NULL,
  kind              TEXT NOT NULL,  -- insight | nudge | celebration | pattern
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  read_at           TIMESTAMPTZ
)
```

### `entries` (legacy — kept for now)

The old freeform drop-in table. Retained during transition. May be migrated into `time_blocks` later or kept as a separate "quick note" feature.

---

## Architecture (v2 + notes-first V3)

```
┌─────────────────────────────────────────────────────────┐
│  Browser                                                │
│                                                         │
│  / (landing)          /app (main interface)             │
│                       ├ Timer control (persistent)      │
│                       ├ Calendar (month/week/day)       │
│                       ├ Block editor (slide-in)         │
│                       └ Chat agent (side panel)         │
└──────────┬──────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────┐
│  Server actions                                         │
│  ├ getActiveTimer    — hydrate active_timer row         │
│  ├ startTimer        — create active_timer row          │
│  ├ stopTimer         — move to time_blocks              │
│  ├ saveBlock         — create/update time_blocks        │
│  ├ deleteBlock       — delete time_blocks row           │
│  ├ getCalendarData   — blocks for a date range          │
│  ├ processCoachMessage — chat router/executor           │
│  └ note insight pass — preserve notes + derive signals  │
└──────────┬──────────────────────────────────────────────┘
           │
     ┌─────┴──────┐
     ▼            ▼
┌─────────┐  ┌──────────────┐
│Supabase │  │ OpenRouter   │
│Postgres │  │ (LLM)        │
└─────────┘  └──────────────┘
```

---

## Build priority

Backend readiness for the timer/chat foundation is in place in `app/actions/timer.ts`: `getActiveTimer`, `startTimer`, `stopTimer`, `resumeBlock`, `saveBlock`, `deleteBlock`, and `getCalendarData`. `/app` implements the timer UI, post-stop/manual block editor, today's block list, latest-block resume, and chat panel. The required v2 Supabase tables are installed and REST-visible: `active_timer`, `time_blocks`, `entries`, and `proactive_messages` all return `200` from the project REST API. The V3 schema additions are written in `supabase-v2.sql` and need to be applied to hosted databases where missing. `processCoachMessage` routes natural-language chat into `active_timer` and `time_blocks`; `entries` is legacy-only.

Current implementation status:

| Area | Status |
|---|---|
| Timer persistence | Implemented through `active_timer`. |
| Stop-to-block flow | Implemented; stopped timers create `time_blocks`. |
| Block save/edit/delete | Implemented for user-owned `time_blocks`, including manual completed-block creation from `/app`. |
| Custom categories | Implemented through `time_block_categories`; the editor and chat can create/use user-owned categories while keeping default categories. |
| Note version preservation | Implemented in `saveBlock`/`stopTimer`; meaningful note edits write to `time_block_note_versions`. |
| Note-derived insights | Implemented as a lightweight extraction pass into `time_block_insights`; changing notes regenerates the current insight from the latest note version while raw notes remain untouched. |
| Chat start/stop timer | Implemented through `processCoachMessage`. |
| Chat completed-block logging | Implemented; writes to `time_blocks` only and never creates new legacy `entries`. |
| Conversational coach chat | Implemented as a separate `coach_chat` path; ordinary conversation does not force block parsing. |
| Chat clarification gate | Implemented for missing timing/task/category details before completed-block writes; category may be inferred only from confident keyword matches. |
| Chat analysis | Implemented over saved `time_blocks` with notes-first retrieval: notes, metadata, derived insights, linked chat, then general chat. Richer period summaries remain future work. |
| Notes mirror dashboard | Implemented in `/app/dashboard`; surfaces note-grounded friction, hyperfocus/flow, satisfaction, and emotional-tone observations with evidence excerpts. |
| ADHD marker dashboard | Implemented; counts explicit block marker booleans plus matching note-derived insight signals. |
| Legacy `entries` writes | Removed from the new chat logging path; table remains legacy-only. |
| Verification | `npm run build` passes; authenticated browser QA for live Supabase/OpenRouter flows remains after applying the hosted V3 migration. |

### Phase 1 — Core tracker
1. Timer control (start / stop) — implemented
2. Block editor (task name, category, hashtags, notes) — implemented
3. Daily calendar view (timeline/list of blocks) — simple daily list implemented; full timeline remains
4. Manual block creation (backdating) — implemented through the daily add-block button and `saveBlock`

Manual block creation behavior:

- The daily blocks header exposes an add-block button with a plus icon.
- The existing block editor is reused for unsaved manual drafts.
- New manual drafts default to start = 30 minutes before now, end = now.
- Task, category, hashtags, and notes start blank.
- Notes are optional, but the editor frames them as “what really happened” and invites actions, friction, feeling, changes, and noticed context.
- Category is required, but users can type a new category name to create a user-owned category.
- Save calls `saveBlock` without an `id`, creating one completed `time_blocks` row.
- Task name, category, and valid start/end ordering use the same validation as regular block edits.
- Saving notes also refreshes derived insight rows and preserves meaningful note changes.

Chat completed-block behavior:

- Chat is coach-first, not parser-first. Ordinary conversation, emotional check-ins, uncertainty, and general updates should get a conversational response.
- Chat enters completed-block logging only when the user clearly asks to log/save/record work, gives completed-work phrasing, answers a pending draft, or provides timing/category details that make a block intent clear.
- Chat writes completed work to `time_blocks` only.
- Before saving, chat requires a usable time window or enough data to derive one from start/end/duration.
- A duration-only completed log is treated as a block ending now.
- Chat requires a task name before saving.
- Chat uses an extracted category first, then a deterministic keyword inference when exactly one default category matches.
- If the user gives a new category name, chat creates that category for the user and saves the block with it.
- If category is ambiguous or missing, chat stores the draft in `coach_drafts` and asks: "what category should i file it under?"

### Phase 2 — Calendar breadth
5. Weekly calendar view — pending
6. Monthly calendar view — pending

### Phase 3 — Chat + analysis
7. Chat agent (starts/stops timer, logs completed blocks, reads blocks for ADHD-informed responses) — notes-first pass implemented
8. Pattern markers (avoidance, hyperfocus, guilt) flagged from chat/block metadata and note-derived insights — implemented for current save paths and dashboard reads

### Phase 4 — Polish
9. Proactive messages (AI initiates observations) — legacy v1 path exists; notes/time-block version pending

---

## What carries over from v1

- Warm cream + terracotta + sage aesthetic — unchanged.
- ADHD-informed affect schema (mood, effort, satisfaction, markers) — carried into `time_blocks`.
- RESEARCH.md theoretical framework — still the foundation.
- Supabase + OpenRouter stack — unchanged.
- Landing page — unchanged.
- Auth flow — unchanged.
