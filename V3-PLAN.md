  # Alibi v3 Roadmap: From Tracker To Evidence Engine

  ## Summary

  V3 should make Alibi more than a timer/chat logger: it should become an ADHD-informed evidence system that captures provenance, preserves user language, interprets affect patterns,
  and reflects those patterns back gently. The end goal is: every block has enough context to support self-monitoring, reward scaffolding, CBT-style reframing, and long-term
  narrative continuity.

  V3 should be built through audited migrations and app changes, not direct unsupervised database mutation.

  ## Phase 0 — Stabilize V2 Baseline

  - Confirm current V2 flows still work: timer start/stop/resume, manual add block, chat logging, clarification drafts, dashboard read paths.
  - Update SPECS.md from “v2” to a new “v3 planning” section while preserving the current v2 contract.
  - Clean stale docs that still reference v1 entries, project, or receipt-first behavior.
  - Acceptance: npm run build passes and PROJECT/SPECS clearly say what v2 does today.

  ## Phase 1 — Add Provenance To Blocks

  - Add a migration that extends time_blocks with:
      - source: timer | manual | chat | voice | migration
      - raw_input: nullable text, preserving the exact user language when a chat/voice block creates the row
      - input_mode: button | form | text | voice
      - agent_metadata: jsonb default '{}'
  - Update TypeScript TimeBlock and save/stop/chat inputs to pass provenance.
  - Timer blocks use source = timer, manual blocks use manual, chat-created blocks use chat.
  - Acceptance: all newly created blocks show correct source internally, existing rows remain valid.

  ## Phase 2 — Make Hidden Research Fields Visible

  - Add dashboard panels for:
      - mood distribution
      - effort vs satisfaction
      - high-effort / low-satisfaction blocks
      - satisfying low-friction wins
  - Add small block-level badges for mood, effort, satisfaction, and ADHD markers where present.
  - Keep language non-judgmental: no scores, no grading, no “productive/unproductive.”
  - Acceptance: mood, effort, satisfaction, and markers are visible and understandable without feeling like performance metrics.

  ## Phase 3 — Improve Chat Reframing With Evidence

  - Update analyseBlocks / processCoachMessage so check-ins use:
      - task names
      - raw input when available
      - effort markers
      - avoidance markers
      - hyperfocus markers
      - guilt markers
  - Add response rules:
      - quote or paraphrase the user’s own words when useful
      - explicitly counter “I did nothing” using saved blocks
      - call out effort and avoidance without praise theater
  - Acceptance: “i feel like i did nothing” produces a specific, evidence-led reflection using actual blocks and markers.

  ## Phase 4 — Theme And Narrative Layer

  - Treat hashtags as lightweight themes/projects.
  - Add aggregation for recurring hashtags and repeated task language.
  - Surface gentle narrative observations:
      - “you keep returning to cinecircle.”
      - “admin shows up in short, hard blocks.”
      - “your proud blocks often happen after avoided tasks.”
  - Store generated observations in a new table:
      - pattern_observations
      - fields: user_id, kind, period_start, period_end, evidence jsonb, content, created_at, dismissed_at
  - Acceptance: pattern observations cite the blocks or aggregates they came from.

  ## Phase 5 — V2 Proactive Messages Rewrite

  - Replace legacy proactive_messages.entries_count_at_creation logic with time-block-aware cadence.
  - New proactive triggers:
      - enough new blocks since last observation
      - meaningful marker pattern
      - notable effort/satisfaction contrast
      - recurring theme/hashtag
  - Keep proactive messages quiet and rare.
  - Acceptance: proactive messages are based only on time_blocks, not legacy entries.

  ## Phase 6 — Agentic Schema Workflow

  - Add a formal schema-change workflow for future agent-driven DB changes:
      - agent reads schema/spec/types/actions
      - agent proposes migration
      - agent writes SQL migration file
      - human reviews
      - migration is applied manually or through CI
      - app/types/docs are updated in the same change
  - Add schema_decisions.md or a section in PROJECT.md recording why schema fields exist.
  - Acceptance: no future schema change happens without a migration, rationale, rollback note, and verification step.

  ## Phase 7 — Optional V3.5 Voice Layer

  - Add voice input as another input mode, not a separate data model.
  - Voice-created blocks use:
      - source = voice
      - input_mode = voice
      - raw_input = transcript
  - Chat clarification behavior remains the same.
  - Acceptance: voice and text logs produce identical time_blocks shape.

  ## Database Migration Targets

  - Keep existing v2 tables:
      - time_blocks
      - active_timer
      - coach_messages
      - coach_drafts
  - Extend time_blocks; do not replace it.
  - Add only one new table in core v3: pattern_observations.
  - Leave legacy entries read-only/legacy unless a separate migration plan explicitly migrates or removes it.

  ## Test Plan

  - Build: npm run build.
  - Migration dry check: SQL file applies cleanly to a Supabase-compatible database.
  - Existing flow regression:
      - timer start/stop/resume
      - manual add block
      - chat log with clarification
      - chat check-in
      - dashboard load
  - New behavior checks:
      - block provenance is set correctly
      - raw chat input is preserved
      - mood/effort/satisfaction render in dashboard
      - check-in responses use markers and raw input
      - pattern observations include evidence
      - proactive messages no longer depend on legacy entries.

  ## Assumptions

  - V3 should evolve the current time_blocks model, not replace it.
  - Agent-driven database changes must produce reviewed migration files, not run arbitrary SQL directly.
  - The product should remain a witness/evidence tool, not a productivity coach.
  - The highest-value next move is provenance plus interpretation of existing affect/marker fields.
