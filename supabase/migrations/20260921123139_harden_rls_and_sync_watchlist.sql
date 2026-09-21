-- Keep ownership immutable on every user-owned UPDATE.
alter function public.handle_new_user() set search_path = public;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own profile"
  on public.users for update
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "Users can update own watchlist items" on public.user_watchlist_items;
create policy "Users can update own watchlist items"
  on public.user_watchlist_items for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own history" on public.watch_history;
create policy "Users can update own history"
  on public.watch_history for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Replace the two-step client operation with one database transaction.
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
