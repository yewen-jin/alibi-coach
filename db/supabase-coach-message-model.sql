-- Alibi coach message model migration.
-- Run this in the Supabase SQL editor.
-- It backfills only rows where model is missing and does not overwrite existing values.

begin;

alter table public.coach_messages
  add column if not exists model text;

update public.coach_messages
set model = 'openai/gpt-4o-mini'
where model is null;

alter table public.coach_messages
  alter column model set default 'openai/gpt-5-mini';

alter table public.coach_messages
  alter column model set not null;

comment on column public.coach_messages.model is
  'Conversation-level coach model for this chat message. Existing rows before the GPT-5 Mini migration are backfilled to openai/gpt-4o-mini.';

commit;
