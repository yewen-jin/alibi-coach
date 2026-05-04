-- Alibi v2 timer schema.
-- Run this in Supabase SQL editor after the existing v1 entries schema.

create extension if not exists pgcrypto;

create table if not exists public.time_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_seconds integer generated always as (
    case
      when ended_at is null then null
      else floor(extract(epoch from ended_at - started_at))::integer
    end
  ) stored,
  task_name text,
  category text check (
    category is null
    or category in ('deep_work', 'admin', 'social', 'errands', 'care', 'creative', 'rest')
  ),
  hashtags text[] not null default '{}',
  notes text,
  mood text check (
    mood is null
    or mood in ('joyful', 'neutral', 'flat', 'anxious', 'guilty', 'proud')
  ),
  effort_level text check (
    effort_level is null
    or effort_level in ('easy', 'medium', 'hard', 'grind')
  ),
  satisfaction text check (
    satisfaction is null
    or satisfaction in ('satisfied', 'mixed', 'frustrated', 'unclear')
  ),
  avoidance_marker boolean not null default false,
  hyperfocus_marker boolean not null default false,
  guilt_marker boolean not null default false,
  novelty_marker boolean not null default false,
  agent_metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint time_blocks_ended_after_started check (
    ended_at is null or ended_at > started_at
  )
);

alter table public.time_blocks
  add column if not exists agent_metadata jsonb not null default '{}';

create table if not exists public.time_block_note_versions (
  id uuid primary key default gen_random_uuid(),
  time_block_id uuid not null references public.time_blocks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  previous_notes text,
  new_notes text,
  source text not null default 'manual' check (source in ('manual', 'chat', 'agent')),
  created_at timestamptz not null default now(),
  constraint time_block_note_versions_changed check (
    coalesce(previous_notes, '') <> coalesce(new_notes, '')
  )
);

create table if not exists public.time_block_insights (
  id uuid primary key default gen_random_uuid(),
  time_block_id uuid not null references public.time_blocks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null default 'notes' check (source in ('notes')),
  actions text[] not null default '{}',
  emotional_tone text,
  friction_points text[] not null default '{}',
  avoidance_signals text[] not null default '{}',
  hyperfocus_signals text[] not null default '{}',
  satisfaction_signals text[] not null default '{}',
  uncertainty_signals text[] not null default '{}',
  people text[] not null default '{}',
  projects text[] not null default '{}',
  themes text[] not null default '{}',
  evidence_excerpt text,
  model_version text not null,
  created_at timestamptz not null default now(),
  unique (time_block_id)
);

create table if not exists public.active_timer (
  user_id uuid primary key references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.coach_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  message_type text not null default 'chat' check (
    message_type in ('chat', 'ack', 'clarification', 'analysis', 'error')
  ),
  related_time_block_id uuid references public.time_blocks(id) on delete set null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.coach_drafts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  draft jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'resolved')),
  updated_at timestamptz not null default now(),
  expires_at timestamptz
);

create index if not exists time_blocks_user_started_at_idx
  on public.time_blocks (user_id, started_at);

create index if not exists time_blocks_user_ended_at_idx
  on public.time_blocks (user_id, ended_at)
  where ended_at is not null;

create index if not exists coach_messages_user_created_at_idx
  on public.coach_messages (user_id, created_at);

create index if not exists coach_drafts_user_status_idx
  on public.coach_drafts (user_id, status);

create index if not exists time_block_note_versions_block_created_at_idx
  on public.time_block_note_versions (time_block_id, created_at desc);

create index if not exists time_block_insights_user_block_idx
  on public.time_block_insights (user_id, time_block_id);

create or replace function public.set_time_blocks_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_time_blocks_updated_at on public.time_blocks;

create trigger set_time_blocks_updated_at
before update on public.time_blocks
for each row
execute function public.set_time_blocks_updated_at();

alter table public.time_blocks enable row level security;
alter table public.active_timer enable row level security;
alter table public.coach_messages enable row level security;
alter table public.coach_drafts enable row level security;
alter table public.time_block_note_versions enable row level security;
alter table public.time_block_insights enable row level security;

drop policy if exists "Users can select their own time blocks" on public.time_blocks;
create policy "Users can select their own time blocks"
on public.time_blocks
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own time blocks" on public.time_blocks;
create policy "Users can insert their own time blocks"
on public.time_blocks
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own time blocks" on public.time_blocks;
create policy "Users can update their own time blocks"
on public.time_blocks
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own time blocks" on public.time_blocks;
create policy "Users can delete their own time blocks"
on public.time_blocks
for delete
using (auth.uid() = user_id);

drop policy if exists "Users can select their own active timer" on public.active_timer;
create policy "Users can select their own active timer"
on public.active_timer
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own active timer" on public.active_timer;
create policy "Users can insert their own active timer"
on public.active_timer
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own active timer" on public.active_timer;
create policy "Users can update their own active timer"
on public.active_timer
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own active timer" on public.active_timer;
create policy "Users can delete their own active timer"
on public.active_timer
for delete
using (auth.uid() = user_id);

drop policy if exists "Users can select their own coach messages" on public.coach_messages;
create policy "Users can select their own coach messages"
on public.coach_messages
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own coach messages" on public.coach_messages;
create policy "Users can insert their own coach messages"
on public.coach_messages
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own coach messages" on public.coach_messages;
create policy "Users can update their own coach messages"
on public.coach_messages
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own coach messages" on public.coach_messages;
create policy "Users can delete their own coach messages"
on public.coach_messages
for delete
using (auth.uid() = user_id);

drop policy if exists "Users can select their own coach drafts" on public.coach_drafts;
create policy "Users can select their own coach drafts"
on public.coach_drafts
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own coach drafts" on public.coach_drafts;
create policy "Users can insert their own coach drafts"
on public.coach_drafts
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own coach drafts" on public.coach_drafts;
create policy "Users can update their own coach drafts"
on public.coach_drafts
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own coach drafts" on public.coach_drafts;
create policy "Users can delete their own coach drafts"
on public.coach_drafts
for delete
using (auth.uid() = user_id);

drop policy if exists "Users can select their own note versions" on public.time_block_note_versions;
create policy "Users can select their own note versions"
on public.time_block_note_versions
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own note versions" on public.time_block_note_versions;
create policy "Users can insert their own note versions"
on public.time_block_note_versions
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can select their own time block insights" on public.time_block_insights;
create policy "Users can select their own time block insights"
on public.time_block_insights
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own time block insights" on public.time_block_insights;
create policy "Users can insert their own time block insights"
on public.time_block_insights
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own time block insights" on public.time_block_insights;
create policy "Users can update their own time block insights"
on public.time_block_insights
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own time block insights" on public.time_block_insights;
create policy "Users can delete their own time block insights"
on public.time_block_insights
for delete
using (auth.uid() = user_id);
