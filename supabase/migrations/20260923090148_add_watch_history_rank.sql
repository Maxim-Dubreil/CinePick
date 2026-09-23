-- rank isn't recoverable from existing columns: id is a UUID (no natural
-- order) and every row in one /recommend batch shares the same decided_at
-- (one now() per insert statement). Needed to replay candidates in their
-- original AI order once match_score/critique are written at proposal time
-- instead of decision time.
alter table watch_history add column rank smallint;
