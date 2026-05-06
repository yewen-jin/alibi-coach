-- One-time backfill for companion_message_insights from existing user chat.
-- Safe to rerun. It upserts by message_id and does not mutate raw chat rows.
--
-- Run after db/supabase-companion-message-insights.sql.

with user_messages as (
  select
    message.id as message_id,
    message.user_id,
    message.conversation_id,
    message.related_time_block_id,
    coalesce(conversation.kind, 'general') as conversation_kind,
    message.content,
    message.created_at,
    left(regexp_replace(trim(message.content), '\s+', ' ', 'g'), 220) as evidence_excerpt,
    lower(message.content) as lower_content
  from public.companion_messages message
  left join public.companion_conversations conversation
    on conversation.id = message.conversation_id
  where message.role = 'user'
    and trim(message.content) <> ''
),
derived as (
  select
    gen_random_uuid() as id,
    user_id,
    message_id,
    conversation_id,
    related_time_block_id,
    case
      when conversation_kind = 'time_block' or related_time_block_id is not null
        then 'time_block'
      else 'general'
    end as scope,
    case
      when lower_content ~ '\m(actually )?(did|worked on|fixed|wrote|drafted|reviewed|planned|cleaned|called|emailed|sorted|read|researched|built|debugged|finished|completed)\M'
        then array[evidence_excerpt]
      else '{}'::text[]
    end as did_actions,
    case
      when lower_content ~ '\m(meant|intended|planned|wanted|was going|was supposed|needed|hoped) to\M'
        then array[evidence_excerpt]
      else '{}'::text[]
    end as intended_actions,
    case
      when lower_content ~ '\m(avoided|put off|deferred|delayed|procrastinated|kept delaying|didn''t get to|did not get to)\M'
        then array[evidence_excerpt]
      else '{}'::text[]
    end as avoided_or_deferred,
    case
      when lower_content ~ '\m(stuck|blocked|scattered|distracted|overwhelmed|interrupted|couldn''t focus|could not focus|hard to start|friction)\M'
        then array[evidence_excerpt]
      else '{}'::text[]
    end as friction_points,
    case
      when lower_content ~ '\m(felt|feeling|feel|felt like|feels like|feel like|guilty|anxious|flat|proud|relieved|frustrated|stressed|overwhelmed|scattered|tired|drained)\M'
        then array[evidence_excerpt]
      else '{}'::text[]
    end as emotional_signals,
    case
      when lower_content ~ '\m(distracted|sidetracked|pulled|derailed|ended up|useful detour|useful drift|useful distraction|useful sidetrack)\M'
       and lower_content ~ '\m(fixed|found|did|made|helped|useful|worth|solved|cleared)\M'
        then array[evidence_excerpt]
      else '{}'::text[]
    end as useful_drift,
    case
      when lower_content ~ '(felt like|feels like|feel like)\s+i\s+(did|got)\s+nothing'
        or lower_content ~ '\m(didn''t count|did not count|doesn''t count|does not count)\M'
        or lower_content ~ '\m(but actually|actually)\M.*\m(did|fixed|finished|completed|found|made|worked)\M'
        then array[evidence_excerpt]
      else '{}'::text[]
    end as mismatch_signals,
    evidence_excerpt,
    'chat-mirror-sql-backfill-v1' as model_version,
    created_at
  from user_messages
),
with_themes as (
  select
    *,
    array_remove(array[
      case when cardinality(did_actions) > 0 then 'did' end,
      case when cardinality(intended_actions) > 0 then 'intention' end,
      case when cardinality(avoided_or_deferred) > 0 then 'avoidance' end,
      case when cardinality(friction_points) > 0 then 'friction' end,
      case when cardinality(emotional_signals) > 0 then 'emotion' end,
      case when cardinality(useful_drift) > 0 then 'useful drift' end,
      case when cardinality(mismatch_signals) > 0 then 'mismatch' end
    ], null)::text[] as themes
  from derived
)
insert into public.companion_message_insights (
  id,
  user_id,
  message_id,
  conversation_id,
  related_time_block_id,
  scope,
  did_actions,
  intended_actions,
  avoided_or_deferred,
  friction_points,
  emotional_signals,
  useful_drift,
  mismatch_signals,
  themes,
  evidence_excerpt,
  model_version,
  created_at
)
select
  id,
  user_id,
  message_id,
  conversation_id,
  related_time_block_id,
  scope,
  did_actions,
  intended_actions,
  avoided_or_deferred,
  friction_points,
  emotional_signals,
  useful_drift,
  mismatch_signals,
  themes,
  evidence_excerpt,
  model_version,
  created_at
from with_themes
where cardinality(themes) > 0
on conflict (message_id) do update
set
  related_time_block_id = excluded.related_time_block_id,
  scope = excluded.scope,
  did_actions = excluded.did_actions,
  intended_actions = excluded.intended_actions,
  avoided_or_deferred = excluded.avoided_or_deferred,
  friction_points = excluded.friction_points,
  emotional_signals = excluded.emotional_signals,
  useful_drift = excluded.useful_drift,
  mismatch_signals = excluded.mismatch_signals,
  themes = excluded.themes,
  evidence_excerpt = excluded.evidence_excerpt,
  model_version = excluded.model_version;

select
  count(*) as backfilled_companion_message_insights
from public.companion_message_insights
where model_version = 'chat-mirror-sql-backfill-v1';
