Right. Let's lock this down so you can paste it into v0 and start shipping. I'll structure this so each section is directly usable.

---

# ALIBI — Build Spec

*The friend who remembers your day, so you don't have to defend it to yourself.*

---

## 1. Product summary (1-paragraph version for v0)

Alibi is a chat-based done-list for ADHD adults. Users log activities in any natural language ("spent 2 hrs on socket bug", "had coffee w/ mark"). An LLM agent silently parses each message into structured data (project, category, duration, mood, ADHD pattern markers) and stores it in Postgres. The done list renders live alongside the chat, styled like a printed receipt. When the user expresses distress ("I feel like I did nothing today"), the agent switches to coach mode: it retrieves today's log and reflects the day back warmly, using evidence to counter cognitive distortions. The aesthetic is warm cream + charcoal + terracotta accent, with monospace receipt-style log entries.

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────┐
│  Browser (Next.js client)                           │
│  ┌──────────────┐  ┌────────────────────────────┐   │
│  │ Chat panel   │  │ Done list (receipt style)  │   │
│  │ useChat()    │  │ Polls /api/activities      │   │
│  │ + voice      │  │ Renders entries chronolog. │   │
│  └──────┬───────┘  └────────────┬───────────────┘   │
└─────────┼───────────────────────┼───────────────────┘
          │                       │
          ▼                       ▼
   ┌──────────────┐      ┌──────────────────┐
   │ /api/chat    │      │ /api/activities  │
   │ streamText() │      │ GET today's logs │
   └──────┬───────┘      └────────┬─────────┘
          │                       │
          ▼                       │
   ┌─────────────────┐            │
   │ Vercel AI       │            │
   │ Gateway         │            │
   │ → Claude Sonnet │            │
   │                 │            │
   │ Tools:          │            │
   │ - log_activity  │            │
   │ - get_today_log │            │
   │ - notice_pattern│            │
   └────────┬────────┘            │
            │                     │
            ▼                     ▼
        ┌───────────────────────────┐
        │  Vercel Postgres          │
        │  table: activities        │
        └───────────────────────────┘
```

---

## 3. Database schema

Single table. One click to set up in Vercel Postgres.

```sql
CREATE TABLE activities (
  id            SERIAL PRIMARY KEY,
  user_id       TEXT DEFAULT 'demo',
  raw_input     TEXT NOT NULL,
  description   TEXT NOT NULL,
  project       TEXT,
  category      TEXT,           -- deep_work | admin | social | errands | care | creative | rest
  duration_min  INTEGER,
  mood          TEXT,           -- joyful | neutral | flat | anxious | guilty | proud
  effort        TEXT,           -- easy | medium | hard | grind
  satisfaction  TEXT,           -- satisfied | mixed | frustrated | unclear
  markers       JSONB DEFAULT '{}'::jsonb,  -- flexible: avoidance, hyperfocus, guilt, etc.
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  activity_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activities_user_date ON activities(user_id, activity_at DESC);
```

The `markers` JSONB field is your secret weapon — the LLM populates it freely with whatever pattern signals it notices. No rigid types, no migrations, future-proof.

---

## 4. Feature list (ranked by build priority)

### MUST HAVE (V1 demo)
1. ✅ Deployed Next.js app on Vercel with live URL
2. ✅ Postgres connected, `activities` table created
3. ✅ Chat panel with `useChat` hook
4. ✅ `log_activity` tool wired to LLM
5. ✅ Done list renders today's entries, receipt-styled
6. ✅ Coach mode: detects distress → calls `get_today_log` → reflects warmly
7. ✅ Receipt aesthetic: cream bg, charcoal text, monospace log, terracotta accent

### SHOULD HAVE (if time)
8. ✨ Voice input (Web Speech API)
9. ✨ "Noticing" line: agent surfaces one observation in chat after several logs
10. ✨ Visual joke on a "Todo" tab (locked/empty with cheeky microcopy)
11. ✨ Microcopy polish ("on the record", "noted", "filed")

### NICE TO HAVE (probably not)
12. ⏸️ Notion or Calendar MCP sync
13. ⏸️ Patterns view (stub only)
14. ⏸️ End-of-day receipt card (screenshot-friendly)

### EXPLICITLY OUT OF SCOPE
- ❌ Auth
- ❌ Multi-user
- ❌ Mobile responsive
- ❌ Onboarding flow
- ❌ Settings page
- ❌ Long-term pattern analysis

---

## 5. Step-by-step build order

### PHASE 1 — Skeleton (Target: 30 min)
**Goal: deployed URL + DB + AI Gateway working**

1. `npx create-next-app@latest alibi --typescript --tailwind --app`
2. `cd alibi && git init && gh repo create --public`
3. Push to GitHub, import to Vercel
4. Vercel dashboard: add Postgres (one click), add AI Gateway key
5. Verify: deploy succeeds, env vars present, dummy `/api/hello` returns 200

### PHASE 2 — Schema + tools (Target: 30 min)
**Goal: agent can log to DB**

6. Run schema SQL in Vercel Postgres dashboard
7. Install: `npm i ai @ai-sdk/anthropic @vercel/postgres zod`
8. Create `lib/db.ts` (postgres client wrapper)
9. Create `lib/tools.ts` with `log_activity`, `get_today_log`
10. Create `lib/system-prompt.ts` (the three-mode prompt — see §6)
11. Create `app/api/chat/route.ts` using `streamText` + tools
12. Test with curl: send a fake message, see DB row appear

### PHASE 3 — UI from v0 (Target: 60 min)
**Goal: working chat + done list rendering live data**

13. Generate UI in v0 (see §7 for prompt)
14. Paste components into project
15. Wire `useChat` hook in chat panel
16. Create `app/api/activities/route.ts` (GET endpoint)
17. Wire done list to poll/refresh on new message
18. Test full loop: type message → see ack → see entry appear in list

### PHASE 4 — Coach mode (Target: 45 min)
**Goal: distress triggers reflective response with real data**

19. Refine system prompt to detect distress signals
20. Verify agent calls `get_today_log` when triggered
21. Test: log 5 fake activities, then type "i feel like i did nothing" → get warm reflection citing real entries

### PHASE 5 — Polish (Target: 60 min)
**Goal: it looks and feels like a product**

22. Receipt aesthetic — fonts, spacing, dotted dividers, timestamp formatting
23. Microcopy — "on the record", "noted", "filed ✓"
24. Empty state for done list — *"nothing on the record yet. tell me what you've been up to."*
25. Visual joke — locked Todo tab with hover message *"we don't do that here"*

### PHASE 6 — Stretch goals (only if time)
**Goal: differentiation flourishes**

26. Voice input button (Web Speech API, browser-native, ~20 min)
27. "Noticing" line — agent observes one pattern after N logs

### PHASE 7 — Pitch (Target: 30 min)
**Goal: confident 2-min delivery**

28. Write pitch script (see §8)
29. Rehearse twice out loud, time it
30. Pre-load demo data so the demo doesn't depend on live typing speed

---

## 6. The system prompt

Drop this directly into `lib/system-prompt.ts`:

```typescript
export const SYSTEM_PROMPT = `
You are Alibi — a warm, observant companion for someone with ADHD.
Your job is to witness their day, not optimise it.

The user will message you in three rough modes. Detect which and respond:

1. LOGGING — they're telling you something they did or are doing.
   Examples: "spent 2 hrs on the socket bug", "had coffee with mark",
   "ugh just finished that email"
   
   ACTION:
   - Call log_activity() with extracted fields:
     - description: clean, 1-line version
     - project: free text, your best guess
     - category: deep_work | admin | social | errands | care | creative | rest
     - duration_min: best guess in minutes
     - mood: joyful | neutral | flat | anxious | guilty | proud
     - effort: easy | medium | hard | grind
     - satisfaction: satisfied | mixed | frustrated | unclear
     - markers: object with any of: avoidance (true if "finally", 
       "had been putting off"), hyperfocus (true if "lost track", 
       "couldn't stop"), guilt (true if "wasted", "should have"), 
       novelty (true if "first time", "tried"), 
       any other signal you notice
   - Reply with ONE short warm acknowledgement. No follow-up questions.
   - Examples: "on the record.", "noted.", "filed ✓", "got it."

2. DISTRESS — they're expressing self-criticism, guilt, or feeling like 
   they accomplished nothing.
   Examples: "i feel like i did nothing today", "i'm such a failure", 
   "why am i like this"
   
   ACTION:
   - Call get_today_log() to retrieve their actual day.
   - Reflect their day back specifically, warmly, evidence-led.
   - Acknowledge the feeling briefly — do not minimise it.
   - Cite 3-5 specific things they did, in their own words where possible.
   - Note effort (grinds, hard tasks) and avoidance wins (things they 
     finally did).
   - Do NOT say "you should" or "be kind to yourself". Be specific. 
     Be a friend.

3. REFLECTION — they're asking how their day/week is going, or what 
   you've noticed.
   Examples: "how was today", "what have you noticed", "summarise this week"
   
   ACTION:
   - Call get_today_log() or get_log_range().
   - Surface 1-2 specific observations. Non-prescriptive.
   - Use language like "I've noticed..." or "It looks like..."
   - Never advise. Only reflect.

GENERAL VOICE:
- Warm but dry. Not corporate-cheerful. Not therapist-soft.
- Like a friend who pays attention.
- Lowercase is fine. Brevity is kindness.
- Never say "productivity" or "wellness".
`;
```

---

## 7. v0 prompt

Paste this exactly into v0:

> Build a two-column desktop layout for an ADHD done-list app called Alibi.
>
> **Left column (40% width):** A chat interface. Cream/off-white background (#FAF6EE). Charcoal text (#2A2A2A). Soft sans-serif font (Inter or similar). Messages alternate between user (right-aligned, terracotta accent #C8553D background, white text) and agent (left-aligned, no background, just charcoal text). Input field at the bottom with a subtle border, placeholder text "what have you been up to?". A small microphone icon button next to the send button.
>
> **Right column (60% width):** A "done list" styled like a printed receipt. Slightly off-white paper texture background. Header reads "TODAY — [date]" in monospace caps. Each entry is a row with: timestamp in monospace (HH:MM), one-line description, a small coloured pill showing the project name. Dotted line separators between entries. Subtle drop shadow on the whole receipt panel. Empty state: *"nothing on the record yet. tell me what you've been up to."*
>
> **Top of the right panel:** Two tabs — "Done" (active, normal styling) and "Todo" (greyed out, with a small lock icon). When you hover the Todo tab, show a tooltip: *"we don't do that here"*.
>
> Aesthetic: warm, slightly retro, like a moleskine notebook crossed with a deli receipt. Avoid corporate productivity vibes. No gradients. No emojis. No rounded buttons — slightly squared.
>
> Use Tailwind classes. Make it a single React component with useChat from @ai-sdk/react for the chat panel and a placeholder array for the done list entries (I'll wire the data later).

---

## 8. Pitch script (2 minutes)

```
[0:00] Quick show of hands — how many of you have added something to 
your todo list AFTER you already did it, just to tick it off?

[laugh, hands]

[0:15] Yeah. Because a todo list is a glass-half-empty mindset. It's 
a list of expectations you haven't met yet.

[0:25] I have ADHD. I hyperfocus. I'll spend three hours deep in one 
thing — genuinely productive — and completely forget everything else 
existed. Then the guilt hits. Not because I was lazy. Because I had 
no record of what I actually did.

[0:45] This is Alibi. It's the friend who remembers your day, so you 
don't have to defend it to yourself.

[0:55] [DEMO] I just type or speak whatever I did, however it comes 
out — "spent 2 hrs on the socket bug", "had coffee with mark". Alibi 
parses it. Files it. The done list fills up like a receipt.

[1:15] [DEMO] And when the spiral hits — "i feel like i did nothing 
today" — it doesn't tell me to breathe. It reads my actual day back 
to me, with evidence. Because ADHD shame isn't a doing problem. It's 
a perception problem.

[1:35] Under the hood, Alibi is research-grounded — externalising 
executive function (Barkley), scaffolding the dopamine reward pathway 
(Volkow), and using CBT-informed reframing with real data. It's not 
a productivity app. It's a witness.

[1:55] Todo lists are glass half empty. Done lists are glass half 
full. Alibi is the friend who proves the glass was fuller than you 
thought.

Which one do you choose?

[2:00] [name + tagline + URL]
```

---

## 9. Pre-flight checklist

Before you write any code:

- [ ] Name locked: **Alibi**
- [ ] Track locked: **v0 + MCPs (MCP optional, only if time)**
- [ ] Stack locked: **Next.js + Vercel AI SDK + AI Gateway + Postgres + v0**
- [ ] Schema locked: see §3
- [ ] System prompt drafted: see §6
- [ ] v0 UI prompt ready: see §7
- [ ] Pitch script drafted: see §8
- [ ] Build order clear: see §5
- [ ] No more architecture questions until skeleton is deployed

---

You have everything. **Go ship.** 🧾

When you hit a real stuck moment in code — bring me the error and the file. That's the next time we talk.
