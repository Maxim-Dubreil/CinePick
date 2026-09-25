-- The SELECT and INSERT policies on watch_history were created by hand on the
-- dev project before migrations were versioned, and no migration ever created
-- them: a database built from migrations alone (the prod project) had neither,
-- so Historique, the last accepted film and the profile stats read nothing.
--
-- SELECT: recreated here, idempotent (dev already has it).
drop policy if exists "Users can view own history" on public.watch_history;
create policy "Users can view own history"
  on public.watch_history for select
  using ((select auth.uid()) = user_id);

-- INSERT: dropped, not recreated. The frontend only selects and deletes; every
-- row is written by the backend with the service role (bypasses RLS). Letting
-- clients insert only allowed forging history rows, e.g. an "accepted"
-- decision for a film that was never proposed.
drop policy if exists "Users can insert own history" on public.watch_history;
