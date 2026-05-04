# Alibi — The Friend Who Remembers Your Day

A warm, anti-productivity companion for ADHD brains. Alibi witnesses what you actually do, celebrates it, and reflects your patterns back to you — with zero judgment and no performance pressure.

---

## The Problem It Solves

ADHD shame isn't caused by underachievement. It's caused by **the gap between what you actually did and what you remember doing.** By 7pm, despite a full day of deep work, you feel like you accomplished nothing. The guilt spiral starts. Tomorrow is harder.

Alibi closes that gap by being a witness with a warm voice.

---

## What Alibi Does

### 1. Drop-In (any time, any format)
Message Alibi however your brain wants — one word, full sentence, voice note transcript. It parses silently, files the entry, and replies with warmth: *"on the record."* / *"got it."* / *"noted."*

### 2. Check-In (when you spiral)
Message: *"I feel like I did nothing today."* Alibi switches modes, reads your actual entries back to you with warmth and cites the evidence.

### 3. The Receipt
A thermal-paper-aesthetic record of your day, grouped TODAY / YESTERDAY / weekday. Timestamped, with project pills. Lives in the right panel of the chat. Pulls live from the database.

### 4. The Dashboard (The Mirror)
A self-portrait drawn from your own data. Calendar heatmap, project distribution, time-of-day rhythm, ADHD pattern markers. Not a productivity dashboard — a quiet reflection.

### 5. Proactive Messages (The Chorus)
Alibi initiates. Three internal agents run quietly after each drop-in:
- **Fetcher** — pulls recent entries from the database
- **Parser** — extracts patterns (active projects, time-of-day rhythms, mood shifts, streaks)
- **Insight Generator** — writes one short message in Alibi's voice, stored as a proactive message

Frequency scales with data — silent when there's nothing meaningful, up to 3 messages/day with 50+ lifetime entries.

### 6. ADHD Marker Tracking
Each entry is parsed for four ADHD-significant signals, stored in the database and visualised in the dashboard:
- **Avoidance conquered** — "finally sent that email I was dreading"
- **Hyperfocus** — long uninterrupted sessions, "lost track of time"
- **Guilt moments** — self-critical language ("should have", "wasted")
- **Novelty seeking** — "first time", "trying something new"

---

## Routes

| Route | Purpose |
|---|---|
| `/` | Public landing page with demo chat (localStorage-backed) |
| `/app` | Authenticated Alibi: chat panel + receipt |
| `/app/dashboard` | Calendar heatmap, project distribution, rhythm chart, ADHD markers |
| `/app/docs` | Feature guide with links to chat and dashboard |
| `/auth/login` | Email/password login |
| `/auth/sign-up` | Sign up |
| `/auth/sign-up-success` | Post sign-up confirmation |
| `/auth/error` | Auth error page |
| `/auth/callback` | Supabase OAuth callback |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, React 19) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4, glass-morphism, warm cream palette |
| Database | Supabase Postgres with Row Level Security |
| Auth | Supabase Auth (email/password) |
| AI | AI SDK v6 via OpenRouter (`@ai-sdk/openai-compatible`) |
| Charts | Recharts (calendar heatmap, rhythm bars, project distribution) |

---

## Database Schema

### `entries`
```sql
entries (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  raw_input         TEXT,                      -- exact user message as typed
  content           TEXT NOT NULL,             -- cleaned/extracted description
  project           TEXT,                      -- auto-extracted project tag
  mood              TEXT,                      -- joyful | neutral | flat | anxious | guilty | proud
  duration_minutes  INTEGER,
  effort_level      TEXT,                      -- easy | medium | hard | grind
  satisfaction      TEXT,                      -- satisfied | mixed | frustrated | unclear
  avoidance_marker  BOOLEAN DEFAULT FALSE,     -- ADHD: overcame avoidance
  hyperfocus_marker BOOLEAN DEFAULT FALSE,     -- ADHD: deep flow state
  guilt_marker      BOOLEAN DEFAULT FALSE,     -- ADHD: self-critical language
  novelty_marker    BOOLEAN DEFAULT FALSE,     -- ADHD: novelty-seeking
  created_at        TIMESTAMPTZ DEFAULT NOW()
)
```

### `proactive_messages`
```sql
proactive_messages (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content                     TEXT NOT NULL,
  kind                        TEXT DEFAULT 'insight',  -- insight | nudge | celebration | pattern
  entries_count_at_creation   INTEGER,
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  read_at                     TIMESTAMPTZ
)
```

Both tables protected by RLS — users can only read and write their own rows.

---

## ADHD Marker Detection

The AI classifier extracts markers from natural language on every drop-in. Examples:

| User types | Markers detected |
|---|---|
| `"finally sent that email i was dreading"` | `avoidance_marker: true`, `effort_level: hard`, `satisfaction: satisfied` |
| `"3 hours on the parser, lost track of time"` | `hyperfocus_marker: true`, `duration_minutes: 180` |
| `"should have done more today"` | `guilt_marker: true`, `mood: guilty` |
| `"tried a new approach to the routing problem"` | `novelty_marker: true` |

These are surfaced in the dashboard's **ADHD Markers** panel with counts, percentages, and effort/satisfaction distribution charts.

---

## Proactive Message Cadence

| Lifetime entries | Max messages/day |
|---|---|
| < 5 | 0 — stay silent |
| 5–19 | 1 |
| 20–49 | 2 |
| 50+ | 3 |

A message is only generated when: enough entries since last message (≥ 3 entries OR ≥ 4 hours) AND the daily limit isn't hit AND the parser found something worth saying. **Silence is a feature.**

---

## File Structure

```
alibi-coach/
├── app/
│   ├── page.tsx                        # Public landing page (demo chat)
│   ├── layout.tsx
│   ├── globals.css                     # Tailwind v4 + design tokens
│   ├── app/
│   │   ├── page.tsx                    # Authenticated chat (Alibi)
│   │   ├── dashboard/page.tsx          # Dashboard visualisations
│   │   └── docs/page.tsx               # Feature guide
│   ├── auth/
│   │   ├── login/page.tsx
│   │   ├── sign-up/page.tsx
│   │   ├── sign-up-success/page.tsx
│   │   ├── error/page.tsx
│   │   └── callback/route.ts
│   └── actions/
│       ├── process-message.ts          # Drop-in / check-in handler + AI parser
│       ├── generate-insight.ts         # Proactive insight agent
│       ├── get-entries.ts              # Fetch user entries from DB
│       └── proactive-messages.ts       # Fetch unread proactive messages
├── components/
│   ├── alibi.tsx                       # Main chat + receipt panel (client)
│   ├── top-nav.tsx                     # Nav: chat / dashboard / docs + sign out
│   ├── proactive-bubble.tsx            # Proactive message display
│   ├── ack-toast.tsx                   # Filed confirmation toast
│   ├── coach-response.tsx              # Check-in reflection display
│   ├── daily-receipt.tsx               # Thermal receipt component
│   ├── entry-input.tsx                 # Chat input field
│   ├── entry-list.tsx                  # Entry list (reference)
│   ├── done-list-app.tsx               # Done list wrapper
│   └── dashboard/
│       ├── adhd-markers.tsx            # ADHD markers + effort/satisfaction charts
│       ├── calendar-view.tsx           # Month heatmap with day detail drawer
│       ├── rhythm-chart.tsx            # Hour-of-day + weekday aggregation
│       ├── project-distribution.tsx    # Time per project bar chart
│       └── stats-overview.tsx          # Streak, total entries, total minutes
├── lib/
│   ├── supabase/
│   │   ├── server.ts                   # SSR Supabase client
│   │   ├── client.ts                   # Browser Supabase client
│   │   └── middleware.ts               # Session refresh middleware
│   ├── ai.ts                           # Shared OpenRouter model instance
│   ├── cadence.ts                      # Proactive message frequency rules
│   ├── dashboard-data.ts               # Aggregation helpers (heatmap, rhythm, markers)
│   ├── ui-styles.ts                    # Shared glass-morphism + colour constants
│   ├── types.ts                        # Entry, ProactiveMessage, Mood, EffortLevel types
│   └── utils.ts
├── proxy.ts                            # Next.js 16 middleware (session refresh)
├── seed.sql                            # Optional test data (7 days, 40 entries)
├── SPECS.md                            # Product specification
└── RESEARCH.md                         # ADHD research grounding the feature decisions
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- pnpm
- Supabase project with auth enabled
- OpenRouter API key

### Environment Variables
```
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
pnpm install
pnpm dev
```

Apply the schema in Supabase SQL editor (see `Database Schema` above), enable RLS, and add the policies shown in `seed.sql`.

---

## Design System

| Token | Value | Use |
|---|---|---|
| Cream | `#FAF6F0` | Page background |
| Terracotta | `#C4704B` | Primary actions, calendar heat |
| Sage | `#7A9A8A` | Secondary accents, success states |
| Ink | `#2A1F14` | Body text |
| Warm grey | `#A89680` | Muted text, timestamps |

Glass-morphism panels: `rgba(255,250,240,0.55)` with `backdrop-filter: blur(20px)`. Receipt inset: `rgba(250,245,235,0.7)`. Typography: `font-mono` for timestamps and stats; `font-sans` for body.

---

## What Alibi Is Not

| Not | Why |
|---|---|
| A planner | Planning is the friction. Removed it. |
| A tracker with timers | Timers require deciding to track *before* the work — exact ADHD failure mode. |
| A goal-setter | Goals create expectation. We trade in evidence. |
| A productivity dashboard | Numbers create comparison. We collect moments. |
| A wellness app | You don't need techniques. You need a witness. |

---

## The Wellbeing Thesis

> **Most apps make you do more. Alibi helps you see what you already did.**

The gap between what you accomplished and what you *remember* accomplishing is where shame lives. Alibi is a witness that closes that gap — no pressure to perform, no goals, no timers. Just a warm voice saying *"I saw you. You did that."*

---

## License

MIT
