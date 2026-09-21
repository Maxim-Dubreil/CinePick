-- A sync batch mixing enriched and unenriched films omits `origin_country`
-- for unenriched rows; PostgREST sends an explicit NULL (not the column
-- default) whenever another row in the same upsert batch provides the key.
-- A NOT NULL constraint here crashed the whole sync (see
-- backend/tests/test_watchlist_repository.py::test_upsert_films_mixed_batch_against_real_db).
alter table films alter column origin_country drop not null;
