  # Alibi v3 Roadmap: From Tracker To Evidence Engine

  ## Summary

  V3 should treat time_blocks.notes as the primary insight source, because notes are where the user records what really happened: actions, friction, feelings, context, and self-
  perception. Chat history should be the secondary source: useful for emotional state, clarification, and conversational continuity, but less directly tied to a specific time window
  unless linked to a block.

  The end goal: Alibi learns from dated, timed notes first; then uses chat history to understand tone, recurring concerns, and unresolved narratives.

  ## Core Principle

  Insights should be extracted from sources in this order:

  1. Time block notes
      - Highest value because they are tied to start time, end time, duration, category, date, hour, and context.
  2. Time block metadata
      - Category, hashtags, mood, effort, satisfaction, markers.
  3. Chat history linked to blocks
      - Clarifications, acknowledgments, user explanations around a saved block.
  4. General chat history
      - Useful for recurring emotional themes, but weaker as behavioral evidence.

  ## Phase 1 — Make Notes Structurally Important

  - Update product specs so notes are no longer described as optional afterthoughts.
  - Reframe notes as “what really happened”:
      - what I did
      - what got in the way
      - how it felt
      - what changed
      - what I noticed
  - Update block editor copy/placeholder to invite richer notes without forcing them.
  - Keep notes optional, but make the UI clearly support reflection.

  ## Phase 2 — Preserve Note History

  - Add a new table: time_block_note_versions.
  - Store every meaningful note edit with:
      - time_block_id
      - user_id
      - previous_notes
      - new_notes
      - created_at
      - source: manual | chat | agent
  - This matters because changing notes over time is itself useful: the user’s interpretation of the block may evolve.
  - Acceptance: editing a note preserves the prior version instead of losing it.
  - Current insight rows should point to the latest note version that produced them.

  ## Phase 3 — Add Note-Derived Insight Extraction

  - Add an agent action that parses notes after save/update.
  - Store extracted insight data in time_block_insights or time_blocks.agent_metadata.
  - Extract:
      - actions actually performed
      - emotional tone
      - friction points
      - avoidance signals
      - hyperfocus signals
      - satisfaction/reward signals
      - uncertainty or self-criticism
      - people/projects/themes mentioned
  - Keep original notes untouched; extracted data is derived, not replacement truth.
  - If notes are edited, regenerate the current insight from the new note version.
  - If a note is cleared, remove the current note-derived insight for that block.

  ## Phase 4 — Connect Notes To Time Patterns

  - Build queries that combine note-derived insights with:
      - hour of day
      - weekday
      - duration
      - category
      - hashtags
      - mood/effort/satisfaction
  - Examples:
      - “notes after evening blocks mention exhaustion more often.”
      - “deep work after 10am has more satisfaction language.”
      - “admin blocks with avoidance language are usually short but high effort.”
  - Acceptance: insights always cite the note/time evidence they came from.

  ## Phase 5 — Chat As Secondary Context

  - Keep coach_messages as a separate insight source.
  - Use chat history for:
      - recurring emotional phrases
      - questions the user keeps asking
      - clarifications that created blocks
      - narrative themes not captured in notes
  - Link chat messages to blocks whenever possible through related_time_block_id.
  - Do not let general chat override time-block evidence unless the user explicitly says the block record is wrong.

  ## Phase 6 — Insight Retrieval For Coach Responses

  - Update analysis/check-in prompts to retrieve:
      - time blocks in range
      - notes and note-derived insights
      - relevant linked chat messages
      - recent general chat only as background
  - Coach responses should use the strongest evidence first:
      - “in your note, you wrote…”
      - “that block was 90 minutes, and you marked it as grind.”
      - “you’ve mentioned this same friction in three notes this week.”
  - Acceptance: “what patterns do you see?” produces note-grounded observations, not generic summaries.

  ## Phase 7 — V3 Dashboard / Mirror

  - Add a “mirror” or “insights” panel based primarily on notes.
  - Surface gentle observations:
      - recurring friction
      - recurring energy windows
      - themes that feel satisfying
      - tasks that carry guilt language
      - times of day where notes skew proud/flat/anxious
  - Every observation includes a small evidence trail: date, block, note excerpt, or linked chat.
  - No scores, no rankings, no productivity judgment.

  ## Phase 8 — Custom Categories

  - Replace hardcoded-only categories with time_block_categories.
  - Keep the original seven categories as defaults.
  - Let users create categories while editing blocks or answering chat clarification.
  - Store custom categories per user.
  - Keep time_blocks.category as a readable slug during migration and add category_id for the new category record.
  - Acceptance: a user can type a new category name, save the block, and see that category reused later.

  ## Schema Additions

  - time_block_note_versions
      - preserves note history.
  - time_block_insights
      - stores extracted structured interpretations from notes.
  - Optional pattern_observations
      - stores higher-level longitudinal observations generated from many blocks.
  - time_block_categories
      - stores default and user-owned categories.

  Keep time_blocks.notes as the human-authored source of truth.

  ## Test Plan

  - Save a block with notes; insight extraction runs or queues.
  - Edit notes; prior note version is preserved.
  - Ask “what patterns do you see?”; response cites note-derived evidence.
  - Ask “why do I keep avoiding admin?”; response combines notes, categories, time, and markers.
  - Dashboard shows note-derived themes without overwriting raw notes.
  - Chat history contributes only when relevant or linked to blocks.
  - Create a custom category in the editor and save a block with it.
  - Give a new category name to chat during clarification and confirm the saved block uses it.

  ## Assumptions

  - Notes should remain optional, but v3 should encourage richer use.
  - Human-written notes are more trustworthy than AI-derived labels.
  - Chat is important context, but time-bound notes are the primary insight source.
  - Agent extraction should be auditable and reversible; raw notes must never be overwritten.
