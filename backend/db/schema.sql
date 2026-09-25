-- Users
create table users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text,
  avatar_url text,
  letterboxd_username text,
  letterboxd_last_sync timestamptz,
  letterboxd_film_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto-create a `users` row when someone signs up via Supabase Auth (Google OAuth).
-- This function + trigger live only in the database (created via the Supabase SQL editor,
-- not part of the app codebase) — keep this block in sync with the live definition by hand
-- whenever either changes. See supabase/migrations/20260921095252_fix_handle_new_user_target_table.sql
-- for the incident this documents (CIN-76: it pointed at the old `profiles` table name and
-- broke every new signup from 2026-07-03 until the fix).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Global film catalog (shared across all users, populated by sync)
-- TMDB fields (genres, runtime, overview, director) are filled lazily at recommendation time.
create table films (
  id uuid default gen_random_uuid() primary key,
  letterboxd_slug text not null unique,
  tmdb_id integer,
  title text not null,
  year integer,
  poster_url text,
  genres text[],
  runtime integer,
  -- Must stay nullable despite the default: a sync batch mixing enriched and
  -- unenriched films omits this key for unenriched rows, and PostgREST sends
  -- an explicit NULL (not the column default) whenever another row in the
  -- same upsert batch provides the key. A NOT NULL constraint here crashes
  -- the whole sync (see backend/tests/test_watchlist_repository.py::
  -- test_upsert_films_mixed_batch_against_real_db and docs/db-schema.md).
  origin_country text[] default '{}'::text[],
  overview text,
  director text,
  actors text[],
  created_at timestamptz default now()
);

-- User watchlist items (junction: which films a user wants to watch)
create table user_watchlist_items (
  user_id uuid references users(id) on delete cascade not null,
  film_id uuid references films(id) on delete cascade not null,
  added_at timestamptz default now(),
  removed_at timestamptz,
  primary key (user_id, film_id)
);

-- Watch history (decisions made during recommendation sessions)
create table watch_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade not null,
  film_id uuid references films(id) on delete cascade not null,
  recommendation_session_id uuid not null,
  -- 'proposed' is written by /recommend for every candidate shown, before
  -- the user swipes; /recommend/decision updates that row to 'accepted' or
  -- 'skipped'. A decision with no matching 'proposed' row is rejected —
  -- that's how we verify a film was actually shown, not just claimed.
  -- A lower-ranked candidate the session ends before the user ever swipes
  -- to (accept, or explicit "Recommencer") isn't a decision at all — its
  -- row is deleted by abandon_session() rather than given a status.
  decision text check (decision in ('proposed', 'accepted', 'skipped')) not null,
  questions_context jsonb,
  ai_critique text,
  match_score integer,
  -- Not recoverable from id (UUID, no natural order) or decided_at (tied
  -- across one batch's insert). Written at proposal time alongside
  -- ai_critique/match_score, needed to replay candidates in AI order.
  rank smallint,
  decided_at timestamptz default now()
);

-- get_decision_history reads this on every /recommend call (not just when
-- seen != "any" as before), and record_proposals writes ~1-3 rows per call
-- instead of 1 per decision — this table grows and is read faster than
-- before this migration.
create index watch_history_user_id_idx on watch_history (user_id);

-- Reconcile a user's watchlist in one transaction. The backend calls this
-- function with the service role after scraping and enriching the full list.
create or replace function public.sync_user_watchlist(
  p_user_id uuid,
  p_active_film_ids uuid[]
)
returns void
language sql
security invoker
set search_path = public
as $$
  update public.user_watchlist_items
  set removed_at = now()
  where user_id = p_user_id
    and removed_at is null;

  insert into public.user_watchlist_items (user_id, film_id, removed_at)
  select p_user_id, film_id, null
  from unnest(coalesce(p_active_film_ids, '{}'::uuid[])) as film_id
  on conflict (user_id, film_id)
  do update set removed_at = null;
$$;

revoke execute on function public.sync_user_watchlist(uuid, uuid[]) from anon, authenticated;
grant execute on function public.sync_user_watchlist(uuid, uuid[]) to service_role;

-- Activer RLS
alter table users enable row level security;
alter table films enable row level security;
alter table user_watchlist_items enable row level security;
alter table watch_history enable row level security;

-- Policies users
create policy "Users can view own profile"
  on users for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on users for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Clients may only edit these two columns of their own row; everything else
-- on users is written by the backend (service role) or the signup trigger.
revoke update on users from anon, authenticated;
grant update (full_name, avatar_url) on users to authenticated;

create policy "Users can insert own profile"
  on users for insert
  with check (auth.uid() = id);

-- Policies films (catalogue global lisible par tous les utilisateurs authentifiés)
create policy "Authenticated users can view films"
  on films for select
  using (auth.role() = 'authenticated');

-- Policies user_watchlist_items
create policy "Users can view own watchlist items"
  on user_watchlist_items for select
  using (auth.uid() = user_id);

create policy "Users can insert own watchlist items"
  on user_watchlist_items for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own watchlist items"
  on user_watchlist_items for delete
  using (auth.uid() = user_id);

create policy "Users can update own watchlist items"
  on user_watchlist_items for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Policies watch_history
create policy "Users can view own history"
  on watch_history for select
  using ((select auth.uid()) = user_id);

-- No INSERT/UPDATE policy: rows are only written by the backend (service
-- role), which verifies each decision against its "proposed" row.

create policy "Users can delete own history"
  on watch_history for delete
  using (auth.uid() = user_id);

-- Storage: public bucket for user-uploaded profile avatars (CIN-107).
-- Path convention: "{user_id}/avatar.<ext>" — fixed filename per user (upsert on
-- re-upload) so switching avatars doesn't accumulate orphaned files.
-- Server-side limits: 10 MB (the client checks 5 MB on input, but re-encodes
-- the crop at native resolution) and images only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Files are served by public URL without any SELECT policy. SELECT is only
-- granted on one's own folder (needed by upsert uploads) so the bucket can't
-- be listed to enumerate user ids.
create policy "Users can view own avatar folder"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'avatars'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "Users can upload own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can update own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete own avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
