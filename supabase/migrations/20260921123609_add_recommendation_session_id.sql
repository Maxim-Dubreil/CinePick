alter table public.watch_history
  add column recommendation_session_id uuid;

update public.watch_history
set recommendation_session_id = gen_random_uuid()
where recommendation_session_id is null;

create index watch_history_recommendation_session_idx
  on public.watch_history (user_id, recommendation_session_id, film_id);

-- Existing rows predate session-scoped decisions and cannot be decided through
-- the new endpoint. They remain visible in history.
alter table public.watch_history
  alter column recommendation_session_id set not null;
