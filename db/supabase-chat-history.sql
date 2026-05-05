-- Alibi companion chat migration.
-- Run this in Supabase SQL editor after the v2 time_blocks schema exists.
-- This is additive: legacy coach_* objects are left in place and copied forward.

create extension if not exists pgcrypto;

create table if not exists public.companion_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'general' check (kind in ('general', 'time_block')),
  title text,
  related_time_block_id uuid references public.time_blocks(id) on delete set null,
  context_snapshot jsonb not null default '{"kind":"general"}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.companion_conversations
  add column if not exists kind text not null default 'general',
  add column if not exists title text,
  add column if not exists related_time_block_id uuid references public.time_blocks(id) on delete set null,
  add column if not exists context_snapshot jsonb not null default '{"kind":"general"}',
  add column if not exists updated_at timestamptz not null default now();

alter table public.companion_conversations
  drop constraint if exists companion_conversations_kind_check,
  add constraint companion_conversations_kind_check
    check (kind in ('general', 'time_block'));

create table if not exists public.companion_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.companion_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  message_type text not null default 'chat' check (
    message_type in ('chat', 'ack', 'clarification', 'analysis', 'error', 'context')
  ),
  model text not null default 'openai/gpt-5-mini',
  related_time_block_id uuid references public.time_blocks(id) on delete set null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.companion_messages
  add column if not exists conversation_id uuid references public.companion_conversations(id) on delete cascade,
  add column if not exists model text,
  add column if not exists related_time_block_id uuid references public.time_blocks(id) on delete set null,
  add column if not exists metadata jsonb not null default '{}';

update public.companion_messages
set model = 'openai/gpt-5-mini'
where model is null;

alter table public.companion_messages
  alter column conversation_id set not null,
  alter column model set default 'openai/gpt-5-mini',
  alter column model set not null,
  drop constraint if exists companion_messages_message_type_check,
  add constraint companion_messages_message_type_check
    check (message_type in ('chat', 'ack', 'clarification', 'analysis', 'error', 'context'));

create table if not exists public.companion_drafts (
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null references public.companion_conversations(id) on delete cascade,
  draft jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'resolved')),
  updated_at timestamptz not null default now(),
  expires_at timestamptz,
  primary key (user_id, conversation_id)
);

alter table public.companion_drafts
  add column if not exists conversation_id uuid references public.companion_conversations(id) on delete cascade,
  add column if not exists expires_at timestamptz;

create unique index if not exists companion_conversations_user_general_idx
  on public.companion_conversations (user_id)
  where kind = 'general' and related_time_block_id is null;

create unique index if not exists companion_conversations_user_block_idx
  on public.companion_conversations (user_id, related_time_block_id)
  where related_time_block_id is not null;

create index if not exists companion_messages_conversation_created_at_idx
  on public.companion_messages (conversation_id, created_at);

create index if not exists companion_messages_user_created_at_idx
  on public.companion_messages (user_id, created_at);

create index if not exists companion_drafts_user_status_idx
  on public.companion_drafts (user_id, status);

do $$
declare
  legacy_model_expression text;
begin
  if to_regclass('public.coach_messages') is not null then
    select
      case
        when exists (
          select 1
          from information_schema.columns
          where table_schema = 'public'
            and table_name = 'coach_messages'
            and column_name = 'model'
        )
        then 'coalesce(legacy.model, ''openai/gpt-4o-mini'')'
        else '''openai/gpt-4o-mini'''
      end
    into legacy_model_expression;

    execute $backfill$
      insert into public.companion_conversations (
        user_id,
        kind,
        title,
        related_time_block_id,
        context_snapshot,
        created_at,
        updated_at
      )
      select
        legacy.user_id,
        'general',
        'general',
        null,
        '{"kind":"general"}'::jsonb,
        min(legacy.created_at),
        max(legacy.created_at)
      from public.coach_messages legacy
      group by legacy.user_id
      on conflict do nothing
    $backfill$;

    execute format($backfill$
      insert into public.companion_messages (
        id,
        conversation_id,
        user_id,
        role,
        content,
        message_type,
        model,
        related_time_block_id,
        metadata,
        created_at
      )
      select
        legacy.id,
        conv.id,
        legacy.user_id,
        legacy.role,
        legacy.content,
        legacy.message_type,
        %s,
        legacy.related_time_block_id,
        legacy.metadata,
        legacy.created_at
      from public.coach_messages legacy
      join public.companion_conversations conv
        on conv.user_id = legacy.user_id
       and conv.kind = 'general'
       and conv.related_time_block_id is null
      on conflict (id) do nothing
    $backfill$, legacy_model_expression);
  end if;

  if to_regclass('public.coach_drafts') is not null then
    execute $backfill$
      insert into public.companion_conversations (
        user_id,
        kind,
        title,
        related_time_block_id,
        context_snapshot,
        created_at,
        updated_at
      )
      select
        legacy.user_id,
        'general',
        'general',
        null,
        '{"kind":"general"}'::jsonb,
        legacy.updated_at,
        legacy.updated_at
      from public.coach_drafts legacy
      on conflict do nothing
    $backfill$;

    execute $backfill$
      insert into public.companion_drafts (
        user_id,
        conversation_id,
        draft,
        status,
        updated_at,
        expires_at
      )
      select
        legacy.user_id,
        conv.id,
        legacy.draft,
        legacy.status,
        legacy.updated_at,
        legacy.expires_at
      from public.coach_drafts legacy
      join public.companion_conversations conv
        on conv.user_id = legacy.user_id
       and conv.kind = 'general'
       and conv.related_time_block_id is null
      on conflict (user_id, conversation_id) do nothing
    $backfill$;
  end if;
end $$;

alter table public.companion_conversations enable row level security;
alter table public.companion_messages enable row level security;
alter table public.companion_drafts enable row level security;

drop policy if exists "Users can select their own companion conversations" on public.companion_conversations;
create policy "Users can select their own companion conversations"
on public.companion_conversations
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own companion conversations" on public.companion_conversations;
create policy "Users can insert their own companion conversations"
on public.companion_conversations
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own companion conversations" on public.companion_conversations;
create policy "Users can update their own companion conversations"
on public.companion_conversations
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own companion conversations" on public.companion_conversations;
create policy "Users can delete their own companion conversations"
on public.companion_conversations
for delete
using (auth.uid() = user_id);

drop policy if exists "Users can select their own companion messages" on public.companion_messages;
create policy "Users can select their own companion messages"
on public.companion_messages
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own companion messages" on public.companion_messages;
create policy "Users can insert their own companion messages"
on public.companion_messages
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own companion messages" on public.companion_messages;
create policy "Users can update their own companion messages"
on public.companion_messages
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own companion messages" on public.companion_messages;
create policy "Users can delete their own companion messages"
on public.companion_messages
for delete
using (auth.uid() = user_id);

drop policy if exists "Users can select their own companion drafts" on public.companion_drafts;
create policy "Users can select their own companion drafts"
on public.companion_drafts
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own companion drafts" on public.companion_drafts;
create policy "Users can insert their own companion drafts"
on public.companion_drafts
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own companion drafts" on public.companion_drafts;
create policy "Users can update their own companion drafts"
on public.companion_drafts
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own companion drafts" on public.companion_drafts;
create policy "Users can delete their own companion drafts"
on public.companion_drafts
for delete
using (auth.uid() = user_id);

select
  (select count(*) from public.companion_conversations) as companion_conversations,
  (select count(*) from public.companion_messages) as companion_messages,
  (select count(*) from public.companion_drafts) as companion_drafts;
