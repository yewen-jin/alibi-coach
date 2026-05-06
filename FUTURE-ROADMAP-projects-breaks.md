# Future Roadmap: Projects And Breaks

## Summary

Extend the timeline model so Alibi can understand work by project, not just by time category, and can record breaks without destroying the continuity of a running block. These are future phases only and should not weaken the current notes-first, time-block-first contract.

## Key Changes

- Add project tracking as a first-class concept:
  - model a `projects` table and attach a primary `project_id` to each `time_blocks` row
  - keep categories as broad labels and projects as the concrete work stream
  - add a project view in the dashboard/timeline that shows total time per project, recent blocks, and project-level trends
- Add focused vs non-focused tracking under each project block:
  - store focused/non-focused allocation as related rows instead of stuffing it into `time_blocks`
  - prefer a child table linked to `time_blocks` so one block can contain both focused and non-focused portions
  - use this data for project summaries and pattern analysis, not as a replacement for the block itself
- Add break tracking without stopping the block:
  - create a separate break/event table linked to the active timer or time block
  - breaks should be logged as overlay events with their own start/end times and optional notes
  - the timer keeps running; break records only annotate the timeline
- Defer split/combine block editing to a later phase:
  - keep it as roadmap-only for now
  - when implemented, it should allow a block to be split into multiple blocks or combined from adjacent blocks without losing history

## Test Plan

- Create a block with a project and confirm it appears in project totals and project timeline views.
- Record a block with both focused and non-focused segments and confirm the project view aggregates them correctly.
- Log a break during an active block and confirm the running timer does not stop.
- Verify break records are visible in the timeline and do not overwrite the underlying block.
- Confirm the current notes-first analysis still works when project and break data exist.

## Assumptions

- Each time block has one primary project.
- Focused/non-focused is best modeled as a related child table, not as a pair of columns on `time_blocks`.
- Breaks are timeline overlays, not timer interruptions.
- Split/combine is intentionally postponed until there is enough real usage to justify the extra complexity.
