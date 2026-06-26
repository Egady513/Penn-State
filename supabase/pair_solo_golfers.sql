-- ── pair_solo_golfers RPC ───────────────────────────────────────
-- Merges two solo-golfer team records into one real 2-person team.
-- Team A keeps its name + registration; Team B's player + payments move over.
-- Run in Supabase SQL Editor

CREATE OR REPLACE FUNCTION pair_solo_golfers(p_team_a uuid, p_team_b uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Move player from B → A
  UPDATE player SET team_id = p_team_a WHERE team_id = p_team_b;

  -- Move registration record(s) from B → A (preserves payment audit trail)
  UPDATE registration SET team_id = p_team_a WHERE team_id = p_team_b;

  -- Move any check-in purchases from B → A
  UPDATE purchase SET team_id = p_team_a WHERE team_id = p_team_b;

  -- Team A is now a full 2-person team
  UPDATE team SET single_golfer = false WHERE id = p_team_a;

  -- Team B is now empty — delete it
  DELETE FROM team WHERE id = p_team_b;
END;
$$;
