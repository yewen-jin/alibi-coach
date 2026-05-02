# Alibi — The Friend Who Remembers Your Day

A warm, anti-productivity companion for ADHD brains. Alibi witnesses what you actually do, celebrates it, and reflects patterns back to you — with zero judgment and no performance pressure.

## The Problem It Solves

ADHD shame isn't caused by underachievement. It's caused by **the gap between what you actually did and what you remember doing.** By 7pm, despite a full day of deep work, you feel like you accomplished nothing. The guilt spiral starts. Tomorrow is harder.

Alibi closes that gap by being a witness with a warm voice.

## What Alibi Does

### 1. **The Drop-In** (any time, any format)
Message Alibi however your brain wants — voice, one word, a full paragraph. It parses silently, files the entry, and replies with warmth: *"on the record."* / *"got it."* / *"noted."*

### 2. **The Check-In** (when you spiral)
Message: *"I feel like I did nothing today."* Alibi switches modes, reads your day back to you with actual entries cited.

### 3. **The Receipt** (end of day)
A screenshot-friendly card showing your day: timestamped entries, project pills, a quiet summary. Lives in the chat panel.

### 4. **The Mirror** (longer term)
Alibi notices patterns over time — most productive hours, project distribution, mood trends — and reflects them back gently in the dashboard.

### 5. **The Chorus** (proactive messages)
Alibi is a **companion that initiates**. Three internal agents run quietly:
- **Fetcher**: Pulls your entries from the database
- **Parser**: Extracts patterns (active projects, time-of-day rhythms, mood shifts)
- **Insight Generator**: Writes observations in Alibi's warm voice, stored as proactive messages

Frequency scales with data — silent when there's nothing meaningful to say, up to 3 observations per day once you've logged 50+ entries.

## Routes

| Route | Purpose |
|---|---|
| `/` | Public landing page with login button and demo chat |
| `/app` | Authenticated chat panel + receipt |
| `/app/dashboard` | Calendar heatmap, project distribution, time-of-day rhythm, mood timeline, streaks, mirror panel |
| `/app/docs` | Feature guide with internal links to chat and dashboard |
| `/auth/login` | Email/password login |
| `/auth/sign-up` | Sign up |

## Tech Stack

- **Frontend**: Next.js 16 (React 19) with TypeScript, Tailwind CSS v4
- **Backend**: Server Actions, Supabase Postgres with Row Level Security (RLS)
- **AI**: OpenRouter API via `@ai-sdk/openai-compatible`, powered by `ai` SDK v6
- **Styling**: Glass-morphism panels, warm cream palette (#FAF6F0), terracotta (#C4704B), sage green (#7A9A8A)
- **Charts**: Recharts for calendar heatmap, weekday/hour rhythm visualization
- **Auth**: Supabase Auth (email/password)
- **Data Fetching**: Server Actions + SWR for client-side sync

## Key Features

- ✅ **AI-powered entry parsing** — Extracts project, mood, duration from natural language
- ✅ **Drop-in chat** — Warm acknowledgments, no friction
- ✅ **Check-in mode** — Guilt spiral detection and reflection
- ✅ **Receipt panel** — Thermal-paper aesthetic, grouped by day (TODAY/YESTERDAY/weekday)
- ✅ **Dashboard visualizations** — Calendar heatmap, project distribution, time-of-day rhythm
- ✅ **Proactive messages** — Alibi initiates with patterns and celebrations (cadence: 0-3 per day based on entry volume)
- ✅ **RLS-protected database** — Each user sees only their own entries and messages
- ✅ **Public landing page** — Learn about Alibi before logging in, with working demo chat
- ✅ **No todo list** — Intentionally absent; Alibi is about witnessing, not managing

## Database Schema

### `entries`
```sql
entries (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  content TEXT NOT NULL,
  project TEXT,           -- user's project tag (auto-extracted or manual)
  mood TEXT,              -- joyful | proud | neutral | flat | guilty
  duration_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
)
```

### `proactive_messages`
```sql
proactive_messages (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  content TEXT NOT NULL,
  kind TEXT DEFAULT 'insight',  -- insight | nudge | celebration | pattern
  entries_count_at_creation INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
)
```

Both tables protected by RLS policies — users can only access their own data.

## Getting Started

### Prerequisites
- Node.js 18+
- Supabase project with auth enabled
- OpenRouter API key (or any OpenAI-compatible LLM provider)

### Setup

1. **Clone and install**
   ```bash
   git clone <repo>
   cd alibi-coach
   npm install
   ```

2. **Environment variables** (`.env.local`)
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   OPENROUTER_API_KEY=your-openrouter-key
   ```

3. **Create tables** in Supabase (SQL)
   ```sql
   CREATE TABLE entries (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
     content TEXT NOT NULL,
     project TEXT,
     mood TEXT,
     duration_minutes INTEGER,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "users view own entries" ON entries FOR SELECT USING (auth.uid() = user_id);
   -- (insert, update, delete policies similarly)

   CREATE TABLE proactive_messages (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
     content TEXT NOT NULL,
     kind TEXT DEFAULT 'insight',
     entries_count_at_creation INTEGER,
     created_at TIMESTAMPTZ DEFAULT NOW(),
     read_at TIMESTAMPTZ
   );
   ALTER TABLE proactive_messages ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "users view own proactive messages" ON proactive_messages FOR SELECT USING (auth.uid() = user_id);
   -- (insert, update, delete policies similarly)
   ```

4. **Run locally**
   ```bash
   npm run dev
   ```
   Open http://localhost:3000

## File Structure

```
alibi-coach/
├── app/
│   ├── page.tsx                    # Public landing page
│   ├── app/
│   │   ├── page.tsx                # Authenticated chat (Alibi component)
│   │   ├── dashboard/page.tsx       # Dashboard with visualizations
│   │   └── docs/page.tsx            # Feature guide
│   ├── auth/
│   │   ├── login/page.tsx
│   │   └── sign-up/page.tsx
│   ├── actions/
│   │   ├── process-message.ts       # Drop-in/check-in/proactive response
│   │   ├── generate-insight.ts      # Insight agent (parse + write)
│   │   ├── get-entries.ts           # Fetch user's entries from DB
│   │   └── proactive-messages.ts    # Fetch unread proactive messages
│   ├── globals.css                 # Tailwind v4 with design tokens
│   └── layout.tsx
├── components/
│   ├── alibi.tsx                   # Main chat + receipt panel
│   ├── top-nav.tsx                 # Header with nav links + login/logout
│   ├── proactive-bubble.tsx        # Render a single proactive message
│   ├── dashboard/
│   │   ├── calendar-view.tsx       # Month heatmap with day detail drawer
│   │   ├── rhythm-chart.tsx        # Hour + weekday aggregation
│   │   ├── project-distribution.tsx # Time per project
│   │   └── stats-overview.tsx      # Streak counter, mood sparkline
│   └── entry-list.tsx              # (Unused; kept for reference)
├── lib/
│   ├── supabase/
│   │   ├── server.ts               # SSR Supabase client
│   │   └── client.ts               # Client Supabase client
│   ├── ai.ts                       # Shared OpenRouter model instance
│   ├── cadence.ts                  # Proactive message frequency rules
│   ├── dashboard-data.ts           # Aggregation helpers (heatmap, rhythm)
│   ├── ui-styles.ts                # Shared glass-morphism & color constants
│   ├── types.ts                    # Entry, ProactiveMessage types
│   └── utils.ts
├── seed.sql                        # Optional test data
└── SPECS.md                        # Product specification
```

## Design Philosophy

- **Warm, not clinical** — Cream backgrounds, terracotta accents, receipt aesthetic
- **No gamification** — Streaks reported as evidence, not achievements
- **Silent by default** — Proactive messages only appear when Alibi has something real to say
- **Zero friction drop-in** — No formatting, no categories, no timers; just say what you did
- **ADHD-first** — Accepts natural language messy input; works offline-first where possible

## The Wellbeing Thesis

> **Most apps make you do more. Alibi helps you see what you already did.**

The gap between what you accomplished and what you *remember* accomplishing is where shame lives. Alibi is a witness that closes that gap, with no pressure to perform, no goals, no timers — just a warm voice saying *"I saw you. You did that."*

## Contributing

This is a public learning project. Contributions welcome. Please open an issue or PR with your ideas.

## License

MIT
