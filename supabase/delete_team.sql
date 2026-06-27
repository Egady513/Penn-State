-- ── delete_team ─────────────────────────────────────────────────────────
-- Permanently delete a team (used from Admin → Teams to clear abandoned /
-- never-paid registrations). Purchases must be removed first because
-- purchase.team_id has no ON DELETE CASCADE; players, registration, mulligan
-- and score rows cascade automatically, and messages.team_id is set NULL.
CREATE OR REPLACE FUNCTION delete_team(p_team_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM purchase WHERE team_id = p_team_id;
  DELETE FROM team     WHERE id      = p_team_id;
END;
$$;
GRANT EXECUTE ON FUNCTION delete_team(uuid) TO anon, authenticated;
