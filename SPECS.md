# Alibi — Product Spec

## The core promise

> *Alibi is the friend who remembers your day, so you don't have to defend it to yourself.*

Not a planner. Not a tracker. **A witness with a warm voice.**

---

## The user (you)

You have ADHD. You hyperfocus. You lose hours to deep work and forget you did it. You miss other things. By 7pm you feel like you accomplished nothing — even when you accomplished plenty. The guilt spiral starts. You shut down. Tomorrow is harder.

The problem isn't *what you did*. It's that you have **no record of it** and your brain refuses to remember.

---

## What Alibi does — the four moments

### 1. The drop-in (any time, any format)

You message Alibi however your brain wants to. Voice, one word, full paragraph — doesn't matter. Alibi parses it silently, files it, and replies with one warm thing: *"on the record."* / *"got it."* / *"noted."*

### 2. The check-in (when you spiral)

You message: *"I feel like I did nothing today."* Alibi switches modes. Reads your day back to you with warmth, citing actual entries.

### 3. The receipt (end of day)

A screenshot-friendly card of your day. Project pills, timestamps, a quiet summary. Live in the dashboard.

### 4. The mirror (longer term)

Alibi notices patterns over time and reflects them back gently — most productive hours, project distribution, mood trends. Lives in the dashboard.

---

## NEW: The chorus — Alibi talks back

Alibi is no longer a chatbot that only responds. It is a **companion that initiates**.

### How it works

Three internal agents run quietly in the background:

| Agent | Role |
|---|---|
| **Fetcher** | Pulls the user's entries from the database when asked. |
| **Parser** | Looks at the entries and extracts patterns: most active project, time-of-day rhythms, streaks, mood shifts, project drift, returning-to-something signals. |
| **Insight generator** | Takes the parser's output and writes one short message in Alibi's voice — an observation, a celebration, a gentle nudge. Stores it in `proactive_messages`. |

When the user opens the chat, any unread proactive messages appear above their input — visually distinct from check-in coach reflections — with a soft animation. The user can dismiss them. They are never demanding.

### Cadence — frequency scales with data

Alibi is quiet when there's nothing to say.

| Entries logged (lifetime) | Max proactive messages per day |
|---|---|
| < 5 | 0 — too little data, stay silent |
| 5–19 | 1 — one observation per day, max |
| 20–49 | 2 — morning observation + evening reflection on busy days |
| 50+ | 3 — fuller chorus; can also celebrate streaks and patterns |

A new proactive message is only generated when:
- Enough entries have accumulated since the last message (≥ 3 entries OR ≥ 4 hours), AND
- The daily limit hasn't been hit, AND
- The parser found something worth saying.

If the parser finds nothing meaningful, **no message is generated**. Silence is a feature.

---

## NEW: The dashboard

A separate route at `/dashboard`. Linked from the chat header. Shows the user themselves, gently.

### Components

1. **Calendar heatmap** (current month + previous month)
   - Each cell = one day. Cell color intensity = number of entries that day.
   - Hovering / tapping a day reveals the rough list of what was logged: timestamps, content, project pill.
   - Empty days are visible — not styled as failure, just neutral.

2. **Project distribution** (horizontal bar chart)
   - Time spent per project this week / this month (toggle).
   - Sorted by total minutes. Shows breadth, not just depth.

3. **Time-of-day rhythm** (small column chart)
   - Aggregates entries by hour-of-day. Shows when the user actually does things.
   - Useful for ADHD self-knowledge: "I'm most active 11am–1pm."

4. **Mood timeline** (sparkline)
   - Daily mood (from logged entries' mood field), plotted across the last 14 days.
   - No labels of "good" or "bad". Just shape.

5. **Streak counter** (text)
   - "You've logged something on 6 of the last 7 days."
   - Phrased as evidence, not gamification.

6. **The mirror panel** (text block)
   - The most recent proactive message from Alibi, displayed prominently.
   - Plus the last 5 historical proactive messages, scrollable.

### Aesthetic

Same warm cream palette as the chat. Visualisations in terracotta + sage green + charcoal. Receipt-paper card backgrounds. No corporate dashboard chrome.

---

## What Alibi explicitly is *not*

| Not | Because |
|---|---|
| A planner | Planning is the friction. We removed it. |
| A tracker with timers | Timers require deciding to track *before* the work — exact ADHD failure mode. |
| A goal-setter | Goals create expectation. We trade in evidence. |
| A coach who pushes | Push energy makes you avoid the app. |
| A wellness app with breathing exercises | You don't need techniques. You need a witness. |
| A productivity dashboard | Numbers create comparison. We collect moments. |

The new dashboard is **not** a productivity dashboard. It is a self-portrait, drawn in your own data, that you can choose to look at or ignore.

---

## The wellbeing thesis

ADHD shame isn't caused by underachievement. It's caused by **the gap between what you actually did and what you remember doing**. Alibi closes the gap.

> ***Most apps make you do more. Alibi helps you see what you already did.***

---

## Database schema

### `entries`
Already exists. Captures each drop-in.

```sql
entries (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  content TEXT NOT NULL,
  project TEXT,
  mood TEXT,
  duration_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
)
```

### `proactive_messages` (new)
Unsolicited Alibi messages, generated by the insight agent.

```sql
proactive_messages (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  content TEXT NOT NULL,
  kind TEXT NOT NULL,  -- insight | nudge | celebration | pattern
  entries_count_at_creation INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
)
```

Both tables protected by Row Level Security.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  Browser                                            │
│  /                /dashboard                        │
│  ├ Chat panel    ├ Calendar heatmap                 │
│  ├ Coach reply   ├ Project distribution             │
│  └ Proactive msg ├ Time-of-day rhythm               │
│                  ├ Mood timeline                    │
│                  └ Mirror panel (latest insights)   │
└──────────┬──────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────┐
│  Server actions                                     │
│  ├ processMessage  (drop-in / check-in)             │
│  ├ generateInsight (called after entry, on visit)   │
│  └ fetchDashboardData                               │
└──────────┬──────────────────────────────────────────┘
           │
     ┌─────┴──────┐
     ▼            ▼
┌─────────┐  ┌──────────────┐
│Supabase │  │ OpenRouter   │
│Postgres │  │ (LLM)        │
└─────────┘  └──────────────┘
```

The "agents" are function modules that compose:
- `lib/agents/fetcher.ts` — DB queries
- `lib/agents/parser.ts` — pure pattern detection (no LLM)
- `lib/agents/insight.ts` — LLM call to phrase findings as Alibi

Triggered:
- After each successful drop-in (in `processMessage`)
- On page load of `/` and `/dashboard` (server-side, fire-and-forget if cadence allows)

No cron required. The user opening the app is the heartbeat.
