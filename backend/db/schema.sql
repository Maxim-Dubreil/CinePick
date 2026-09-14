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

-- Global film catalog (shared across all users, populated by sync)
-- TMDB fields (genres, runtime, overview) are filled lazily at recommendation time.
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
  decision text check (decision in ('accepted', 'skipped')) not null,
  questions_context jsonb,
  ai_critique text,
  match_score integer,
  decided_at timestamptz default now()
);

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
  using (auth.uid() = id);

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
  using (auth.uid() = user_id);

-- Policies watch_history
create policy "Users can view own history"
  on watch_history for select
  using (auth.uid() = user_id);

create policy "Users can insert own history"
  on watch_history for insert
  with check (auth.uid() = user_id);
