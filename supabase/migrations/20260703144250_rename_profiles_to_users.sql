-- Migration: rename profiles table to users
-- Already applied manually on the cloud project via the SQL editor; this migration
-- documents the change and keeps fresh environments (new local db, CI) in sync.
-- Guarded so it is a no-op if `profiles` no longer exists (cloud) or `users` already exists.

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'profiles')
     AND NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') THEN
    ALTER TABLE profiles RENAME TO users;
  END IF;
END $$;
