-- ── Pre-launch cleanup ──────────────────────────────────────────────────
-- Run ONCE in the Supabase SQL editor before switching Stripe to live keys.
-- Deletes all test registrations and test hole sponsors for this event.
-- Real sponsors (Presenting, Gold, Silver, Bronze, Donor) are NOT touched.
--
-- EVENT_ID: a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11

BEGIN;

DELETE FROM purchase
WHERE team_id IN (
  SELECT id FROM team WHERE event_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
);

DELETE FROM player
WHERE team_id IN (
  SELECT id FROM team WHERE event_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
);

DELETE FROM registration
WHERE team_id IN (
  SELECT id FROM team WHERE event_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
);

DELETE FROM team
WHERE event_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

-- Only remove hole sponsors (auto-created by test payments).
-- Other tiers (Presenting, Gold, Silver, Bronze, Donor) are left intact.
DELETE FROM sponsor
WHERE event_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  AND sponsorship_type = 'Hole';

COMMIT;
