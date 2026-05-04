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
- dashboard notes mirror surfaces note-grounded observations;
- hosted Supabase V3 schema has been applied and REST-verified.

## Current Status

Branch: `dev`

Database setup:

- `active_timer`, `time_blocks`, `entries`, and `proactive_messages` are live and REST-visible.
- V3 additions are applied and REST-visible: `time_block_categories`, `time_block_note_versions`, `time_block_insights`, `time_blocks.category_id`, and `time_blocks.agent_metadata`.
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
| `processCoachMessage` | Implemented; routes coach chat, timer control, block logging, clarification, and notes-first analysis. |

UI status:

- `/app` has timer, post-stop/manual block editor, daily add-block button, latest-block resume, chat panel, and simple daily block list.
- `/app/dashboard` has totals, calendar/rhythm/category views, ADHD markers, and notes mirror.
- `/` and `/app/docs` still mostly describe the v2 product shape and should be updated to match the V3 language in `SPECS.md`.

Verification:

- `npm run build` passes.
- Hosted schema was checked through Supabase REST table/column probes.
- Authenticated browser QA is still needed for note-save, note-edit insight regeneration, custom category creation, chat logging, chat analysis, and dashboard display.

Known working principle:

- Timer UI, manual block creation, and chat logging share `time_blocks`.
- Notes remain human-authored source text.
- Derived insight rows are replaceable and traceable.

## Current Gaps

- Full weekly/monthly calendar timeline views remain pending.
- Period analysis exists but is still shallow; week/month summaries need deterministic aggregation and stronger evidence trails.
- Notes mirror is an initial vertical slice, not a full longitudinal pattern engine.
- Chat can analyze saved data, but its elicitation style should become more deliberate: it should ask better questions about feelings, drift, mixed outcomes, and context.
- RAG is not implemented yet. The project first needs cleaner source records and evidence pointers.
- Agentic database evolution is not implemented. Future work should let the agent propose schema changes, not mutate production schema directly.
- App-facing copy needs to reflect V3: nuanced notes, chat as elicitation, timeline-linked evidence, and future pattern/RAG direction.

## Roadmap

### Phase 1 - Live QA And Copy Alignment

- Run authenticated smoke tests for note save/edit, custom categories, chat logging, chat analysis, and dashboard notes mirror.
- Update `/` and `/app/docs` copy to match the V3 product contract.
- Fix any mismatch where UI copy treats notes as a minor optional field instead of primary evidence.

### Phase 2 - Better Elicitation

- Update the chat prompt so the agent helps the user reconstruct messy time blocks: parallel activity, attention shifts, useful distractions, friction, mood, and body state.
- Let chat help expand or revise notes while preserving note history.
- Ensure chat asks for missing details before writing valid blocks.

### Phase 3 - Timeline-Linked Pattern Analysis

- Build richer week/month analysis over notes, metadata, and linked chat.
- Add evidence-backed observations such as recurring friction by hour, satisfying contexts, avoidance that became useful work, or flatness after certain block types.
- Keep every observation traceable to source blocks/notes/messages.

### Phase 4 - Evidence Model For RAG

- Introduce an explicit evidence/chunk layer only after enough real usage reveals the right retrieval shape.
- Store source pointers from chunks to notes, note versions, chat messages, time blocks, and derived observations.
- Add embeddings and retrieval only for source-backed evidence.

### Phase 5 - Agent-Assisted Schema Evolution

- Let the agent inspect current schema and propose migration drafts for new evidence/RAG tables.
- Keep production database changes explicit, reviewed, and migration-based.
- Track every schema change in this document and the migration SQL.

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

Run live authenticated QA, then update public/docs copy so the visible product language matches the V3 spec.
