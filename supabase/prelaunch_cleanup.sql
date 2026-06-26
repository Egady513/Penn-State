-- ── Pre-launch cleanup ──────────────────────────────────────────
-- Run in Supabase SQL Editor before the registration link goes public.

-- 1) Remove the placeholder seed sponsors ("Sponsor A".."Sponsor K").
--    Real sponsors (Courtesy Automotive, Oakley Pub & Grill, Power Wipes, …)
--    do NOT match this pattern, so they're untouched.
DELETE FROM sponsor
WHERE event_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  AND name ~ '^Sponsor [A-Z]$';

-- 2) Function to sweep abandoned, unpaid registrations.
--    Safe to run anytime; deletes only UNPAID teams older than N minutes
--    (default 120) and their child rows. Paid teams are never touched.
CREATE OR REPLACE FUNCTION cleanup_stale_unpaid_teams(
  p_event_id          uuid,
  p_older_than_minutes int DEFAULT 120
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ids uuid[];
BEGIN
  SELECT array_agg(id) INTO v_ids
  FROM team
  WHERE event_id = p_event_id
    AND payment_status = 'unpaid'
    AND created_at < now() - make_interval(mins => p_older_than_minutes);

  IF v_ids IS NULL THEN
    RETURN 0;
  END IF;

  DELETE FROM purchase     WHERE team_id = ANY(v_ids);
  DELETE FROM registration WHERE team_id = ANY(v_ids);
  DELETE FROM player       WHERE team_id = ANY(v_ids);
  DELETE FROM team         WHERE id      = ANY(v_ids);

  RETURN array_length(v_ids, 1);
END;
$$;

-- Run the sweep once now (clears any test/abandoned teams already in the table):
-- SELECT cleanup_stale_unpaid_teams('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 120);
