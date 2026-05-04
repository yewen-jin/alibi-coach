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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint time_blocks_ended_after_started check (
    ended_at is null or ended_at > started_at
  )
);

create table if not exists public.active_timer (
  user_id uuid primary key references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists time_blocks_user_started_at_idx
  on public.time_blocks (user_id, started_at);

create index if not exists time_blocks_user_ended_at_idx
  on public.time_blocks (user_id, ended_at)
  where ended_at is not null;

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
