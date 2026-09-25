-- Narrow what clients (anon key + user JWT, via PostgREST) may UPDATE directly.
-- The backend writes with the service role, which is unaffected by both
-- grants and RLS.

-- users: RLS already limits updates to one's own row, but Supabase's default
-- table-wide grant let a client rewrite any column of it (email,
-- letterboxd_film_count, letterboxd_last_sync...). The frontend only edits
-- the display name and avatar (EditProfileModal), so only those stay writable.
revoke update on public.users from anon, authenticated;
grant update (full_name, avatar_url) on public.users to authenticated;

-- watch_history: the frontend never updates it; decisions are recorded by
-- /recommend/decision, which checks a matching "proposed" row first. A client
-- UPDATE policy only let users bypass that check and rewrite their own
-- decisions, match scores or critiques. Same reasoning as the INSERT policy
-- dropped in 20260925101856.
drop policy if exists "Users can update own history" on public.watch_history;
