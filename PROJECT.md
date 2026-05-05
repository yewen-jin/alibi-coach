# Alibi - Project Tracker

> Living implementation, history, status, and roadmap tracker.
> Product contract lives in [SPECS.md](./SPECS.md).

## Objective

> **Alibi is the friend who remembers your day, so you don't have to defend it to yourself.**

The product is evolving from a timer-first tracker into a V3 evidence engine: time blocks anchor the timeline, notes preserve what actually happened, chat helps elicit missing context and feelings, and derived insights make patterns visible without replacing raw user input.

## Documentation Roles

- **[SPECS.md](./SPECS.md):** product/system contract, data principles, interface behavior, AI behavior, guardrails, and V3 direction.
- **PROJECT.md:** implementation history, current status, known gaps, verification, and future roadmap.
- **[V3-PLAN.md](./V3-PLAN.md):** detailed roadmap reference for the notes-first insight engine.
- **[RESEARCH.md](./RESEARCH.md):** ADHD/product psychology foundation.

## Evolution History

### v1 - Freeform Chat / Receipt Prototype

The first direction treated chat as the primary input. It captured user text and generated warm reflections, but it lacked reliable structure. The model had too little grounded data to answer specific questions about time, patterns, or actual work.

What remains useful:

- warm, nonjudgmental voice;
- ADHD-informed affect schema;
- "receipt" framing as proof that the day counted;
- Supabase + OpenRouter foundation.

### v2 - Timer And Time Blocks

The project moved to `time_blocks` as the primary data model. Timer, manual entry, and chat all write structured blocks with start/end time, task, category, hashtags, notes, and optional affect/marker fields.

Implemented v2 foundation:

- persistent `active_timer`;
- start/stop timer flow;
- latest-block resume;
- manual completed-block creation;
- edit/delete for user-owned time blocks;
- chat start/stop timer;
- chat completed-block logging with clarification;
- daily block list and dashboard summaries.

### V3 - Notes-First Evidence Engine

The current direction treats notes as the most valuable data in the product. A block is not just "task X for Y hours"; it may contain parallel activity, useful distraction, avoidance, drift, emotional context, and later reinterpretation.

Implemented V3 foundation:

- custom categories through `time_block_categories`;
- meaningful note edits preserved in `time_block_note_versions`;
- note-derived insight extraction into `time_block_insights`;
- note edits regenerate current insight rows;
- chat analysis prioritizes notes, then metadata, then derived insights, then linked/general chat;
- companion chat is split into a general thread plus one reflective thread per completed time block;
- block-specific companion threads use the selected block, including its note, as fixed context and do not mutate blocks in v1;
- dashboard notes mirror surfaces note-grounded observations;
- hosted Supabase V3 schema has been applied and REST-verified.

## Current Status

Branch: `dev`

Database setup:

- `active_timer`, `time_blocks`, `entries`, and `proactive_messages` are live and REST-visible.
- V3 additions are applied and REST-visible: `time_block_categories`, `time_block_note_versions`, `time_block_insights`, `time_blocks.category_id`, and `time_blocks.agent_metadata`.
- Companion chat tables are the current app path: `companion_conversations`, `companion_messages`, and `companion_drafts`.
- Existing legacy `coach_messages` / `coach_drafts` are preserved by additive migration and copied into the general companion thread.
- Default category rows are visible through REST.
- `entries` remains legacy-only for the current app path.

Server action status:

| Function | Status |
| --- | --- |
| `getActiveTimer` | Implemented; hydrates the current user's `active_timer`. |
| `startTimer` | Implemented; creates/preserves one running timer. |
| `resumeBlock` | Implemented; reopens latest completed block from original start time. |
| `stopTimer` | Implemented; moves active timer into `time_blocks`. |
| `saveBlock` | Implemented; creates/updates manual and edited blocks, preserves note versions, refreshes note insights. |
| `deleteBlock` | Implemented; deletes user-owned blocks. |
| `getCalendarData` | Implemented; loads blocks for date ranges. |
| `getCategories` / `createCategory` | Implemented; default and user-owned categories. |
| `processCompanionMessage` | Implemented; routes companion chat, timer control, block logging, clarification, notes-first analysis, and reflective block threads. |

AI model routing:

- OpenRouter access is centralized in `lib/ai.ts`.
- `fastModel` uses `openai/gpt-4.1-nano` for routing, structured extraction, and short acknowledgments.
- `companionModel` uses `openai/gpt-5-mini` for user-visible companion chat, saved-block analysis, and proactive insight copy.
- New `companion_messages` rows record the conversation-level companion model in `model`; the Supabase backfill script preserves legacy rows as `openai/gpt-4o-mini`.
- Companion-facing prompts share the reusable `alibiCompanionGuide` in `lib/companion-voice.ts`.

UI status:

- `/app` has timer, post-stop/manual block editor, daily add-block button, latest-block resume, chat panel, and simple daily block list.
- Daily block rows include `chat about this`, which opens or reopens the block's reflective companion thread.
- The resume button is removed from the DOM while a timer is active; when no timer is active, only the latest completed block can be resumed.
- `/app/dashboard` has totals, calendar/rhythm/category views, ADHD markers, and notes mirror.
- `/app/docs` is now a wiki-style guide explaining what Alibi is, how the evidence model works, how to write useful notes, how to use general and block-specific companion chat, and where the V3/RAG direction is going.
- `/` now describes the notes-first product, existing feature set, and future RAG ambition instead of embedding a fake chat demo.
- `/demo` provides an unauthenticated localStorage-backed demo with name entry, timer, manual blocks, chat-style logging, edit/delete, latest-block resume, and a sign-up CTA.
- `/auth/login` and `/auth/sign-up` use the `STYLES.md` Alibi auth surface, including OAuth provider buttons, while preserving demo redirects and callback behavior.
- `/app` detects completed local demo blocks after login/sign-up and offers to import them into the authenticated account.
- Authenticated and demo chat logs display per-message timestamps and auto-scroll to the newest message.

Verification:

- `npm run build` passes.
- Hosted schema was checked through Supabase REST table/column probes.
- Authenticated browser QA is still needed for note-save, note-edit insight regeneration, custom category creation, chat logging, chat analysis, and dashboard display.

Known working principle:

- Timer UI, manual block creation, and chat logging share `time_blocks`.
- Notes remain human-authored source text.
- Derived insight rows are replaceable and traceable.
- Block-specific companion threads are reflective only and use compact block context instead of broad retrieval.
- Public demo data stays in browser `localStorage` until the user imports completed blocks into an authenticated account.

## Current Gaps

- Full weekly/monthly calendar timeline views remain pending.
- External calendar/todo/agenda overlays are not implemented yet. Future work should explore Google Calendar or other calendar APIs/MCP connectors so scheduled events and tasks can appear alongside Alibi time blocks.
- Period analysis exists but is still shallow; week/month summaries need deterministic aggregation and stronger evidence trails.
- Notes mirror is an initial vertical slice, not a full longitudinal pattern engine.
- Chat can analyze saved data, but its elicitation style should become more deliberate: it should ask better questions about feelings, drift, mixed outcomes, and context.
- Long notes in block-specific companion context need a cached summary/excerpt strategy before notes become large enough to create token pressure.
- RAG is not implemented yet. The project first needs cleaner source records and evidence pointers.
- Agentic database evolution is not implemented. Future work should let the agent propose schema changes, not mutate production schema directly.
- Demo chat is a local approximation, not the OpenRouter-backed authenticated agent. It is useful for product feel, but not a complete AI demo.

## Roadmap

### Phase 1 - Live QA And Copy Alignment

- Run authenticated smoke tests for note save/edit, custom categories, chat logging, chat analysis, and dashboard notes mirror.
- Smoke test `/demo` localStorage persistence, timer stop/edit, manual block save, chat-created block, resume, clear demo, sign-up/sign-in, and authenticated import.
- Keep `/app/docs` as a wiki, not a feature list. It should explain what Alibi is, how it works, how to write useful notes, and how to prompt chat well.
- Fix any remaining UI copy that treats notes as a minor optional field instead of primary evidence.

### Phase 2 - Better Note Capture

- Improve the block editor so notes are easier to write without turning them into a long required form.
- Support richer note prompts around intended versus actual work, parallel activity, attention shifts, useful distractions, friction, body state, feeling, and outcome.
- Keep one human-written note as the primary source, then derive structure beside it.
- Preserve note-history behavior when notes are edited after the fact.

### Phase 3 - Better Chat Elicitation

- Update the chat prompt so the agent helps the user reconstruct messy time blocks: parallel activity, attention shifts, useful distractions, friction, mood, and body state.
- Separate logging mode from reflection mode so ordinary emotional check-ins do not become forced block writes.
- Let chat help expand or revise notes while preserving note history.
- Add prompt patterns for "ask me questions before saving," "turn this into a useful note," and "help me name what actually happened."
- Ensure chat asks for missing details before writing valid blocks.
- Keep block-specific companion threads scoped to one block and reflective-only unless a later explicit edit flow is added.
- Add cached note summaries or excerpts for very long notes so block threads stay token-efficient without losing note context.

### Phase 4 - Source-Linked Evidence Layer

- Evolve `time_block_insights` toward smaller atomic evidence items only after real usage shows what claims recur.
- Track claim type, source type, source id, time block id, confidence, and evidence excerpt for each extracted claim.
- Use evidence items for attention shifts, useful distractions, friction, satisfaction, uncertainty, people, projects, and recurring themes.
- Keep raw notes and chat as the highest-trust source material.

### Phase 5 - Timeline-Linked Pattern Analysis

- Build richer week/month analysis over notes, metadata, linked chat, and source-linked evidence items.
- Add evidence-backed observations such as recurring friction by hour, satisfying contexts, avoidance that became useful work, or flatness after certain block types.
- Keep every observation traceable to source blocks/notes/messages.

### Phase 6 - Messy Block Data Model

- Do not redesign the schema for multi-activity blocks until enough real notes prove the shape.
- Consider `block_activity_segments` if one time block often needs multiple activity slices.
- Consider explicit attention-shift records if "intended task versus actual task" becomes central.
- Keep the timeline simple until the extra structure removes more ambiguity than it creates.

### Phase 7 - Evidence Model For RAG

- Introduce an explicit retrieval/chunk layer only after enough real usage reveals the right retrieval shape.
- Store source pointers from chunks to notes, note versions, chat messages, time blocks, evidence items, and derived observations.
- Add embeddings and retrieval only for source-backed evidence.
- Require RAG answers to cite dated blocks, note excerpts, chat turns, or stored evidence.

### Phase 8 - Agent-Assisted Schema Evolution

- Let the agent inspect current schema and propose migration drafts for new evidence/RAG tables.
- Keep production database changes explicit, reviewed, and migration-based.
- Track every schema change in this document and the migration SQL.

### Phase 9 - External Calendar And Agenda Context

- Explore Google Calendar, external calendar APIs, or MCP connectors for user-authorized calendar/todo/agenda access.
- Display external scheduled events and tasks as contextual overlays on Alibi calendar views alongside saved `time_blocks`.
- Keep imported calendar/agenda items visually distinct from logged time blocks unless the user explicitly converts or links them.
- Use external agenda data as context for reflection and reconstruction, not as proof of what actually happened.
- Require clear OAuth/permission boundaries, sync status, and disconnect behavior before enabling this in production.

## Demo Flow

1. Open `/app`.
2. Start the timer.
3. Stop it and add a nuanced note about what actually happened.
4. Edit the note later; the prior version is preserved and insight rows refresh.
5. Add a manual block with a new custom category.
6. Ask chat to log a completed block; it asks for missing time/task/category before saving.
7. Ask "what patterns do you see today?" and get a note-grounded response.
8. Open `/app/dashboard` and see evidence-backed notes mirror observations.

## Next Step

Run live authenticated QA, then update landing-page copy so the visible product language matches the V3 spec.
