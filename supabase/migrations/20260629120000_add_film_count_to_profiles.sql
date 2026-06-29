alter table profiles
  add column if not exists letterboxd_film_count integer default 0;
