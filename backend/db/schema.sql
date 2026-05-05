-- Profiles
create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text,
  avatar_url text,
  letterboxd_username text,
  letterboxd_last_sync timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Watchlist films
create table watchlist_films (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  letterboxd_id text not null,
  tmdb_id integer,
  title text not null,
  year integer,
  poster_url text,
  genres text[],
  runtime integer,
  overview text,
  created_at timestamptz default now(),
  unique(user_id, letterboxd_id)
);

-- Watch history
create table watch_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  film_id uuid references watchlist_films(id) on delete cascade not null,
  decision text check (decision in ('accepted', 'skipped')) not null,
  questions_context jsonb,
  ai_critique text,
  match_score integer,
  decided_at timestamptz default now()
);

-- Activer RLS
alter table profiles enable row level security;
alter table watchlist_films enable row level security;
alter table watch_history enable row level security;

-- Policies profiles
create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on profiles for insert
  with check (auth.uid() = id);

-- Policies watchlist_films
create policy "Users can view own watchlist"
  on watchlist_films for select
  using (auth.uid() = user_id);

create policy "Users can insert own watchlist"
  on watchlist_films for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own watchlist"
  on watchlist_films for delete
  using (auth.uid() = user_id);

-- Policies watch_history
create policy "Users can view own history"
  on watch_history for select
  using (auth.uid() = user_id);

create policy "Users can insert own history"
  on watch_history for insert
  with check (auth.uid() = user_id);