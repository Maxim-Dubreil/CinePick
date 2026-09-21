-- Lets a user permanently remove one of their own history entries (CinePick
-- history page). No DELETE policy existed before — insert/select/update only.
-- Deleting a row means get_decision_history (backend/repositories/watch_history.py)
-- no longer sees it, so the film becomes eligible for re-recommendation again;
-- this is the intended behaviour (chosen over a soft-delete flag that would
-- have kept it excluded).
create policy "Users can delete own history"
  on watch_history for delete
  using (auth.uid() = user_id);
