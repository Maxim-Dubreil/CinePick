-- Fix: handle_new_user() still targeted public.profiles, renamed to public.users in
-- 20260703144250_rename_profiles_to_users.sql. This function was created by hand in the
-- Supabase SQL editor (never tracked in a migration) and was missed by that rename.
--
-- Trigger `on_auth_user_created` fires AFTER INSERT ON auth.users, in the same transaction,
-- so the insert into a nonexistent table rolled back every new signup since 2026-07-03 (CIN-76).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
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
