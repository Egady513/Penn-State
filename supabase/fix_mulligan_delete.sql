-- ============================================================
-- Mulligans: backing one down to zero never actually deleted.
--
-- The client DELETE returned 204 while RLS silently filtered every row,
-- so the count stuck at its last value and the team kept being billed
-- $2 for a mulligan they had removed. Route both writes through a
-- SECURITY DEFINER RPC, the same pattern the rest of the app uses.
--
-- Golf tables only. Pickleball has its own tables and functions.
-- Safe to re-run.
-- ============================================================

CREATE OR REPLACE FUNCTION set_mulligan(p_team_id uuid, p_hole_number int, p_count int)
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count int;
BEGIN
  -- Server-side guard so the 2-per-hole cap does not depend on the client.
  v_count := GREATEST(0, LEAST(2, COALESCE(p_count, 0)));

  IF v_count = 0 THEN
    DELETE FROM mulligan
     WHERE team_id = p_team_id AND hole_number = p_hole_number;
    RETURN 0;
  END IF;

  INSERT INTO mulligan (team_id, hole_number, count, paid)
  VALUES (p_team_id, p_hole_number, v_count, false)
  ON CONFLICT (team_id, hole_number)
  DO UPDATE SET count = EXCLUDED.count, paid = false;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION set_mulligan(uuid, int, int) TO anon, authenticated;

-- ------------------------------------------------------------
-- Name the wipes sponsor the way their own site does:
-- powercleanwipes.com says "Zeek's Power Clean Wipes".
-- ------------------------------------------------------------
UPDATE sponsor
   SET name = 'Zeek''s Power Clean Wipes'
 WHERE event_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
   AND name ILIKE '%power%wipes%';

UPDATE hole
   SET contest_label = 'Zeek''s Power Clean Wipes Tee-Off Challenge'
 WHERE event_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
   AND number = 5;
