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
- **Chat is read-only analysis** — the AI reads your blocks and tells you things. It does not accept input.

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

### 4. The analysis chat (read-only)

The AI coach lives in a side panel or separate route. It has **read access to your blocks** but **cannot be used to log new ones**.

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
| A freeform chatbot | Chat is for reading your data, not inputting it. |

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
  category          TEXT CHECK (category IN (
                      'deep_work', 'admin', 'social',
                      'errands', 'care', 'creative', 'rest'
                    )),
  hashtags          TEXT[],                           -- e.g. {'cinecircle','coding'}
  notes             TEXT,

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

  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
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

## Architecture (v2)

```
┌─────────────────────────────────────────────────────────┐
│  Browser                                                │
│                                                         │
│  / (landing)          /app (main interface)             │
│                       ├ Timer control (persistent)      │
│                       ├ Calendar (month/week/day)       │
│                       ├ Block editor (slide-in)         │
│                       └ Analysis chat (side panel)      │
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
│  └ analyseBlocks     — LLM call with block context      │
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

Backend readiness for Phase 1 is in place in `app/actions/timer.ts`: `getActiveTimer`, `startTimer`, `stopTimer`, `saveBlock`, `deleteBlock`, and `getCalendarData`. `/app` now implements the Phase 1 UI slice with the persistent timer, post-stop block editor, and today's block list. The required v2 Supabase tables are installed and REST-visible: `active_timer`, `time_blocks`, `entries`, and `proactive_messages` all return `200` from the project REST API. `analyseBlocks` remains Phase 3.

### Phase 1 — Core tracker
1. Timer control (start / stop)
2. Block editor (task name, category, hashtags, notes)
3. Daily calendar view (timeline of blocks)

### Phase 2 — Calendar breadth
4. Weekly calendar view
5. Monthly calendar view

### Phase 3 — Analysis
6. Analysis chat (reads blocks, ADHD-informed responses)
7. Pattern markers (avoidance, hyperfocus) flagged by AI post-hoc

### Phase 4 — Polish
8. Proactive messages (AI initiates observations)
9. Manual block creation (backdating)

---

## What carries over from v1

- Warm cream + terracotta + sage aesthetic — unchanged.
- ADHD-informed affect schema (mood, effort, satisfaction, markers) — carried into `time_blocks`.
- RESEARCH.md theoretical framework — still the foundation.
- Supabase + OpenRouter stack — unchanged.
- Landing page — unchanged.
- Auth flow — unchanged.
