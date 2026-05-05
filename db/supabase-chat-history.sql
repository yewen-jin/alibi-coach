-- Alibi chat history migration.
-- Run this in the Supabase SQL editor after the v2 time_blocks schema exists.

create extension if not exists pgcrypto;

create table if not exists public.coach_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  message_type text not null default 'chat' check (
    message_type in ('chat', 'ack', 'clarification', 'analysis', 'error')
  ),
  model text not null default 'openai/gpt-5-mini',
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

create index if not exists coach_messages_user_created_at_idx
  on public.coach_messages (user_id, created_at);

create index if not exists coach_drafts_user_status_idx
  on public.coach_drafts (user_id, status);

alter table public.coach_messages enable row level security;
alter table public.coach_drafts enable row level security;

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
