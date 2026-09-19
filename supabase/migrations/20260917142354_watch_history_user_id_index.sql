-- /recommend now calls get_decision_history on every request (previously
-- get_excluded_film_ids was skipped when seen == "any"), and each call to
-- /recommend inserts ~1-3 rows via record_proposals instead of 1 row per
-- decision — watch_history grows faster and is read more often. No index
-- existed on user_id before this.
create index watch_history_user_id_idx on watch_history (user_id);
