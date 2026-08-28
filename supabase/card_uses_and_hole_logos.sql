-- ============================================================
-- Multi-use advantage cards (Golf Ball Toss = 5 throws per card)
-- Golf tables only. Pickleball uses pb_ tables and its own functions.
-- Safe to re-run.
-- ============================================================

-- 1. How many uses one unit of an item is worth. Everything is 1 except
--    Ball Toss, which is 5 throws per card purchased.
ALTER TABLE catalog_item ADD COLUMN IF NOT EXISTS uses_per_unit int NOT NULL DEFAULT 1;
ALTER TABLE purchase     ADD COLUMN IF NOT EXISTS used_count    int NOT NULL DEFAULT 0;

UPDATE catalog_item
   SET uses_per_unit = 5
 WHERE event_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
   AND name ILIKE '%ball toss%'
   AND uses_per_unit <> 5;

-- 2. Backfill the counter from the old boolean so nothing already marked
--    used comes back as unused.
UPDATE purchase p
   SET used_count = GREATEST(1, COALESCE(c.uses_per_unit, 1) * GREATEST(COALESCE(p.quantity, 1), 1))
  FROM catalog_item c
 WHERE c.id = p.catalog_item_id
   AND p.used = true
   AND p.used_count = 0;

-- 3. Tap up or down, clamped to what the team actually bought.
--    Keeps the old `used` boolean in sync so nothing else breaks.
CREATE OR REPLACE FUNCTION set_purchase_uses(p_id uuid, p_delta int)
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_total int; v_new int;
BEGIN
  SELECT GREATEST(1, COALESCE(c.uses_per_unit, 1)) * GREATEST(COALESCE(p.quantity, 1), 1)
    INTO v_total
    FROM purchase p
    JOIN catalog_item c ON c.id = p.catalog_item_id
   WHERE p.id = p_id;

  IF v_total IS NULL THEN
    RAISE EXCEPTION 'Purchase % not found', p_id;
  END IF;

  UPDATE purchase
     SET used_count = LEAST(v_total, GREATEST(0, used_count + p_delta)),
         used       = LEAST(v_total, GREATEST(0, used_count + p_delta)) >= v_total
   WHERE id = p_id
   RETURNING used_count INTO v_new;

  RETURN v_new;
END;
$$;

GRANT EXECUTE ON FUNCTION set_purchase_uses(uuid, int) TO anon, authenticated;

-- 4. Put the two activation sponsors on their holes so their logo shows on
--    the scorecard. sponsorship_type stays blank on purpose: the public
--    "Hole Sponsors" list keys off that, and these two gave more than the
--    $100 hole tier. hole_number only drives the in-app logo.
UPDATE sponsor SET hole_number = 13
 WHERE event_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND name ILIKE '%backswing%';

UPDATE sponsor SET hole_number = 5
 WHERE event_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND name ILIKE '%power wipes%';
