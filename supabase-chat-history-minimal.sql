-- Minimal Alibi chat history schema.
-- For constrained Supabase/v0 SQL runners, run one statement at a time.

create extension if not exists pgcrypto;

create table if not exists public.coach_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  message_type text not null default 'chat' check (message_type in ('chat', 'ack', 'clarification', 'analysis', 'error')),
  related_time_block_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.coach_drafts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  draft jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'resolved')),
  updated_at timestamptz not null default now(),
  expires_at timestamptz
);

create index if not exists coach_messages_user_created_at_idx on public.coach_messages (user_id, created_at);

create index if not exists coach_drafts_user_status_idx on public.coach_drafts (user_id, status);

alter table public.coach_messages enable row level security;

alter table public.coach_drafts enable row level security;

create policy "coach_messages_select_own"
on public.coach_messages
for select
using (auth.uid() = user_id);

create policy "coach_messages_insert_own"
on public.coach_messages
for insert
with check (auth.uid() = user_id);

create policy "coach_messages_update_own"
on public.coach_messages
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "coach_messages_delete_own"
on public.coach_messages
for delete
using (auth.uid() = user_id);

create policy "coach_drafts_select_own"
on public.coach_drafts
for select
using (auth.uid() = user_id);

create policy "coach_drafts_insert_own"
on public.coach_drafts
for insert
with check (auth.uid() = user_id);

create policy "coach_drafts_update_own"
on public.coach_drafts
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "coach_drafts_delete_own"
on public.coach_drafts
for delete
using (auth.uid() = user_id);
