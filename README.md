# Alibi — The Friend Who Remembers Your Day

A warm, anti-productivity companion for ADHD brains. Alibi records what actually happened, keeps the evidence tied to time, and reflects patterns back without scores, streak pressure, or productivity judgment.

The current product is timer-first and notes-first:

- Work is stored as dated `time_blocks`.
- Notes are the human-authored source of truth: what happened, what got in the way, how it felt, what changed, and what the user noticed.
- Chat is a secondary input surface that can start/stop timers, log completed blocks, ask clarifying questions, and answer from saved evidence.
- Dashboard insights are grounded in saved blocks, note-derived signals, and visible evidence trails.

---

## The Problem It Solves

ADHD shame is often caused by the gap between what you actually did and what you remember doing. By evening, even a full day can feel like nothing. Alibi closes that gap by being a witness with a warm voice.

---

## What Alibi Does

### 1. Timer-first tracking

Start the timer without naming the task first. Metadata comes after the work, so the app does not make planning the entry cost.

### 2. Block editor

Stopped and manual blocks can be edited with:

- task name
- category
- start/end time
- hashtags
- notes
- mood, effort, satisfaction, and ADHD marker metadata when available

Notes are optional, but the UI now frames them as “what really happened.”

### 3. Chat agent

Chat can:

- respond conversationally without forcing a log
- start or stop the timer
- log completed work into `time_blocks`
- ask for missing timing/task/category before saving
- answer check-ins and pattern questions from saved evidence

Chat history is useful context, but block notes are treated as stronger evidence.

### 4. Notes-first insight engine

When a block is saved or updated:

- meaningful note edits are preserved in `time_block_note_versions`
- note-derived signals are stored in `time_block_insights`
- raw notes remain untouched and remain the source of truth

Extracted signals include friction, avoidance, hyperfocus/flow, satisfaction, uncertainty/self-criticism, emotional tone, people, projects, themes, and evidence excerpts.

### 5. Dashboard mirror

The dashboard shows:

- totals and tracked time
- calendar/rhythm/category summaries
- ADHD marker counts
- effort and satisfaction distributions
- a notes mirror with note-grounded observations and evidence excerpts

The ADHD patterns panel counts both explicit block markers and note-derived insight signals.

---

## Routes

| Route | Purpose |
|---|---|
| `/` | Public landing page |
| `/app` | Authenticated timer, block editor, daily block list, and chat panel |
| `/app/dashboard` | Dashboard summaries, ADHD markers, and notes mirror |
| `/app/docs` | Feature guide |
| `/auth/login` | Email/password login |
| `/auth/sign-up` | Sign up |
| `/auth/sign-up-success` | Post sign-up confirmation |
| `/auth/error` | Auth error page |
| `/auth/callback` | Supabase auth callback |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 App Router, React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Database | Supabase Postgres with Row Level Security |
| Auth | Supabase Auth |
| AI | AI SDK v6 through OpenRouter |

### AI model and voice configuration

OpenRouter model setup is centralized in [`lib/ai.ts`](./lib/ai.ts):

- `fastModelId` is `openai/gpt-4.1-nano` for routing, structured extraction, and short acknowledgments.
- `companionModelId` is `openai/gpt-5-mini` for user-visible companion chat, saved-block analysis, and proactive insight copy.

Alibi's reusable companion voice prompt lives in [`lib/companion-voice.ts`](./lib/companion-voice.ts). Change `alibiCompanionGuide` there to tune how the companion sounds. It is used by companion chat, saved-block analysis, and proactive insight generation.

---

## Database Schema

The primary schema is in [db/supabase-v2.sql](./db/supabase-v2.sql).

For existing Supabase projects, run [db/supabase-chat-history.sql](./db/supabase-chat-history.sql) once to create the additive `companion_*` tables and backfill legacy chat rows without deleting them.

### `time_blocks`

Primary source of saved work.

```sql
time_blocks (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_seconds integer generated always as (...) stored,
  task_name text,
  category text,
  hashtags text[] not null default '{}',
  notes text,
  mood text,
  effort_level text,
  satisfaction text,
  avoidance_marker boolean not null default false,
  hyperfocus_marker boolean not null default false,
  guilt_marker boolean not null default false,
  novelty_marker boolean not null default false,
  agent_metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)
```

### `active_timer`

One active timer row per user.

```sql
active_timer (
  user_id uuid primary key references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  created_at timestamptz not null default now()
)
```

### `companion_conversations`

One global thread plus one optional reflective thread per saved time block.

```sql
companion_conversations (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  title text,
  related_time_block_id uuid references time_blocks(id) on delete set null,
  context_snapshot jsonb not null default '{"kind":"general"}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)
```

### `companion_messages`

Thread-scoped companion history. Block-thread messages remain isolated from the general companion chat.

```sql
companion_messages (
  id uuid primary key,
  conversation_id uuid not null references companion_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  content text not null,
  message_type text not null default 'chat',
  model text not null default 'openai/gpt-5-mini',
  related_time_block_id uuid references time_blocks(id) on delete set null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
)
```

### `companion_drafts`

Temporary clarification state for the general companion thread when chat needs more details before saving a block.

### `time_block_note_versions`

Preserves meaningful note edits.

```sql
time_block_note_versions (
  id uuid primary key,
  time_block_id uuid not null references time_blocks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  previous_notes text,
  new_notes text,
  source text not null check (source in ('manual', 'chat', 'agent')),
  created_at timestamptz not null default now()
)
```

### `time_block_insights`

Derived interpretation from notes. This is not replacement truth.

```sql
time_block_insights (
  id uuid primary key,
  time_block_id uuid not null unique references time_blocks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null default 'notes',
  actions text[] not null default '{}',
  emotional_tone text,
  friction_points text[] not null default '{}',
  avoidance_signals text[] not null default '{}',
  hyperfocus_signals text[] not null default '{}',
  satisfaction_signals text[] not null default '{}',
  uncertainty_signals text[] not null default '{}',
  people text[] not null default '{}',
  projects text[] not null default '{}',
  themes text[] not null default '{}',
  evidence_excerpt text,
  model_version text not null,
  created_at timestamptz not null default now()
)
```

### Legacy Tables

`entries` and the older proactive-message path remain in the repo for legacy/reference purposes. New chat logging writes to `time_blocks`, not `entries`.

---

## ADHD Pattern Detection

There are two layers:

1. Explicit block metadata on `time_blocks`
   - `avoidance_marker`
   - `hyperfocus_marker`
   - `guilt_marker`
   - `novelty_marker`
   - `mood`
   - `effort_level`
   - `satisfaction`

2. Note-derived insight rows in `time_block_insights`
   - avoidance signals
   - hyperfocus/flow signals
   - friction points
   - satisfaction/reward signals
   - uncertainty/self-criticism
   - emotional tone

The dashboard merges both sources by block id, so a note-derived hyperfocus signal appears in the ADHD patterns card even if an older block boolean was never backfilled.

---

## File Structure

```text
alibi-coach/
├── app/
│   ├── page.tsx
│   ├── layout.tsx
│   ├── globals.css
│   ├── app/
│   │   ├── page.tsx
│   │   ├── dashboard/page.tsx
│   │   └── docs/page.tsx
│   ├── auth/
│   └── actions/
│       ├── timer.ts
│       ├── process-message.ts
│       ├── generate-insight.ts
│       ├── get-entries.ts
│       └── proactive-messages.ts
├── components/
│   ├── timer-tracker-app.tsx
│   ├── top-nav.tsx
│   ├── proactive-bubble.tsx
│   ├── companion-response.tsx
│   └── dashboard/
│       ├── adhd-markers.tsx
│       ├── notes-mirror.tsx
│       ├── calendar-view.tsx
│       ├── rhythm-chart.tsx
│       ├── project-distribution.tsx
│       └── stats-overview.tsx
├── lib/
│   ├── note-insights.ts
│   ├── dashboard-data.ts
│   ├── ai.ts
│   ├── types.ts
│   └── supabase/
├── supabase-v2.sql
├── SPECS.md
├── PROJECT.md
└── RESEARCH.md
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- Supabase project with auth enabled
- OpenRouter API key

### Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=
OPENROUTER_API_KEY=
```

### Setup

```bash
git clone https://github.com/yewen-jin/alibi-coach
cd alibi-coach
npm install
npm run dev
```

Apply [supabase-v2.sql](./supabase-v2.sql) in the Supabase SQL editor. If your hosted database already has the v2 tables, make sure the V3 additions are present:

- `time_blocks.agent_metadata`
- `time_block_note_versions`
- `time_block_insights`

### Verification

```bash
npm run build
```

The current build passes.

---

## Current Status

Implemented:

- timer persistence through `active_timer`
- start, stop, resume, save, edit, delete block flows
- manual/backdated block creation
- chat start/stop/log/clarification/check-in flows
- notes-first analysis retrieval for companion responses
- note version preservation
- note-derived insight extraction
- dashboard notes mirror
- ADHD marker dashboard that merges explicit markers and note-derived signals

Pending:

- hosted database migration verification wherever the V3 tables are not yet applied
- authenticated browser QA against live Supabase/OpenRouter
- richer week/month analysis
- time-block-aware proactive messages replacing the legacy `entries` cadence

---

## What Alibi Is Not

| Not | Why |
|---|---|
| A planner | Planning is the friction. |
| A to-do list | Tasks create expectation. Alibi records evidence. |
| A goal-setter | Goals create comparison. |
| A companion who pushes | Push energy makes the app easier to avoid. |
| A productivity dashboard | Numbers should support self-knowledge, not judgment. |
| A vague freeform-only chatbot | Chat writes only through structured `time_blocks` and `active_timer` operations. |

---

## The Wellbeing Thesis

> Most apps make you do more. Alibi helps you see what you already did.

The gap between what you accomplished and what you remember accomplishing is where shame lives. Alibi is a witness that closes that gap: no scores, no rankings, no pressure to perform.

---

## License

MIT
