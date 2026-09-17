-- A "proposed" row is written by /recommend for every candidate it returns,
-- before the user has swiped. /recommend/decision then updates that same
-- row to "accepted"/"skipped" — a decision with no matching "proposed" row
-- has nothing to update, which is how we verify a film was actually shown
-- rather than trusting the client's word for it.
alter table watch_history drop constraint watch_history_decision_check;
alter table watch_history add constraint watch_history_decision_check
  check (decision in ('proposed', 'accepted', 'skipped'));

-- No UPDATE policy existed on this table before (only insert/select) because
-- nothing ever updated a row after creating it.
create policy "Users can update own history"
  on watch_history for update
  using (auth.uid() = user_id);
