-- ── challenge_participants ──────────────────────────────────────────────
-- Lists everyone entered in the Long-Drive / Closest-to-Pin challenge (paid
-- entries only). Returns one row per contest per entrant; the admin Overview
-- groups them per golfer/team. SECURITY DEFINER so it works from the
-- unauthenticated admin client regardless of RLS.
CREATE OR REPLACE FUNCTION challenge_participants()
RETURNS TABLE(player_name text, team_name text, contest text)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(pl.name, 'Whole team') AS player_name,
         t.name                          AS team_name,
         ci.tag                          AS contest
  FROM purchase pu
  JOIN catalog_item ci ON ci.id = pu.catalog_item_id
  JOIN team t          ON t.id  = pu.team_id
  LEFT JOIN player pl  ON pl.id = pu.player_id
  WHERE ci.tag IN ('ctp', 'ld')
    AND pu.paid_status = 'paid'
    AND t.event_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
$$;
GRANT EXECUTE ON FUNCTION challenge_participants() TO anon, authenticated;
