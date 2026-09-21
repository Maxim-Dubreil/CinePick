-- Migration: normalize watchlist storage
-- Replaces watchlist_films (denormalized, one row per user×film) with:
--   films              — global film catalog, one row per film regardless of user count
--   user_watchlist_items — junction table linking users to films
--
-- Run this migration once on any environment that still has watchlist_films.
-- The migration is safe to re-run: all statements use IF NOT EXISTS / IF EXISTS.

-- Bootstrap objects that existed before migrations were versioned. Preview
-- databases start empty, while older production databases already contain them.
CREATE TABLE IF NOT EXISTS profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email text NOT NULL,
  full_name text,
  avatar_url text,
  letterboxd_username text,
  letterboxd_last_sync timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS watchlist_films (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  letterboxd_id text NOT NULL,
  tmdb_id integer,
  title text NOT NULL,
  year integer,
  poster_url text,
  genres text[],
  runtime integer,
  origin_country text[] DEFAULT '{}'::text[],
  overview text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, letterboxd_id)
);

CREATE TABLE IF NOT EXISTS watch_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  film_id uuid REFERENCES watchlist_films(id) ON DELETE CASCADE NOT NULL,
  decision text CHECK (decision IN ('accepted', 'skipped')) NOT NULL,
  questions_context jsonb,
  ai_critique text,
  match_score integer,
  decided_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist_films ENABLE ROW LEVEL SECURITY;
ALTER TABLE watch_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can view own profile'
  ) THEN
    CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (
    SELECT FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (
    SELECT FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can insert own profile'
  ) THEN
    CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;

-- 1. Create films table (global catalog)
CREATE TABLE IF NOT EXISTS films (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  letterboxd_slug text NOT NULL UNIQUE,
  tmdb_id integer,
  title text NOT NULL,
  year integer,
  poster_url text,
  genres text[],
  runtime integer,
  origin_country text[] DEFAULT '{}'::text[],
  overview text,
  created_at timestamptz DEFAULT now()
);

-- 2. Create user_watchlist_items table (junction)
CREATE TABLE IF NOT EXISTS user_watchlist_items (
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  film_id uuid REFERENCES films(id) ON DELETE CASCADE NOT NULL,
  added_at timestamptz DEFAULT now(),
  removed_at timestamptz,
  PRIMARY KEY (user_id, film_id)
);

-- 3. Migrate existing data (no-op if watchlist_films is empty or doesn't exist)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'watchlist_films') THEN

    -- 3a. Insert distinct films into global catalog (letterboxd_id → letterboxd_slug)
    INSERT INTO films (letterboxd_slug, tmdb_id, title, year, poster_url, genres, runtime, overview, created_at)
    SELECT DISTINCT ON (letterboxd_id)
      letterboxd_id, tmdb_id, title, year, poster_url, genres, runtime, overview, created_at
    FROM watchlist_films
    ON CONFLICT (letterboxd_slug) DO NOTHING;

    -- 3b. Create watchlist items linking each user to their films
    INSERT INTO user_watchlist_items (user_id, film_id, added_at)
    SELECT wf.user_id, f.id, wf.created_at
    FROM watchlist_films wf
    JOIN films f ON f.letterboxd_slug = wf.letterboxd_id
    ON CONFLICT DO NOTHING;

    -- 3c. Update watch_history FK to point to films instead of watchlist_films
    IF EXISTS (
      SELECT FROM information_schema.table_constraints
      WHERE constraint_name = 'watch_history_film_id_fkey'
    ) THEN
      ALTER TABLE watch_history DROP CONSTRAINT watch_history_film_id_fkey;
      ALTER TABLE watch_history
        ADD CONSTRAINT watch_history_film_id_fkey
        FOREIGN KEY (film_id) REFERENCES films(id) ON DELETE CASCADE;
    END IF;

    -- 3d. Drop old table
    DROP TABLE watchlist_films;

  END IF;
END $$;

-- 4. Enable RLS
ALTER TABLE films ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_watchlist_items ENABLE ROW LEVEL SECURITY;

-- 5. RLS policies — films (readable by all authenticated users)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies WHERE tablename = 'films' AND policyname = 'Authenticated users can view films'
  ) THEN
    CREATE POLICY "Authenticated users can view films"
      ON films FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- 6. RLS policies — user_watchlist_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies WHERE tablename = 'user_watchlist_items' AND policyname = 'Users can view own watchlist items'
  ) THEN
    CREATE POLICY "Users can view own watchlist items"
      ON user_watchlist_items FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT FROM pg_policies WHERE tablename = 'user_watchlist_items' AND policyname = 'Users can insert own watchlist items'
  ) THEN
    CREATE POLICY "Users can insert own watchlist items"
      ON user_watchlist_items FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT FROM pg_policies WHERE tablename = 'user_watchlist_items' AND policyname = 'Users can delete own watchlist items'
  ) THEN
    CREATE POLICY "Users can delete own watchlist items"
      ON user_watchlist_items FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;
