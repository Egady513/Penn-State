-- ── Hole sponsorship offer ──────────────────────────────────────
-- Run in Supabase SQL Editor.
-- Adds two catalog items used by the registration flow:
--   • Hole Sponsorship           = +$100  (tag 'hole_sponsor')
--   • Hole-sponsor team discount = -$15   (tag 'hole_sponsor_discount')
-- When a registrant opts to sponsor a hole, registerTeam writes both as signup
-- purchases. Net effect on a twosome: +$85. The discount is a real negative
-- purchase line so it shows transparently on the order summary and is included
-- in the server-side total the webhook verifies.

INSERT INTO catalog_item (event_id, name, price, unit, channels, active, description, tag, sort_order, per_person)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Hole Sponsorship', 100, 'each',
       ARRAY['signup']::purchase_channel[], true,
       'Your name on a hole, recognized at dinner', 'hole_sponsor', 50, false
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_item
  WHERE event_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND tag = 'hole_sponsor'
);

INSERT INTO catalog_item (event_id, name, price, unit, channels, active, description, tag, sort_order, per_person)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Hole-sponsor team discount', -15, 'each',
       ARRAY['signup']::purchase_channel[], true,
       '$15 off your twosome for sponsoring a hole', 'hole_sponsor_discount', 51, false
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_item
  WHERE event_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND tag = 'hole_sponsor_discount'
);
