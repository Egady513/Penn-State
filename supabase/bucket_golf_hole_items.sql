-- ============================================================
-- On-course purchases tied to a hole (Bucket Golf on Hole 1)
--
-- Golf tables only. Pickleball uses pb_catalog_item and its own
-- functions, so nothing here touches it.
-- Safe to re-run: every statement is idempotent.
-- ============================================================

-- 1. Let a catalog item live on a hole ------------------------
ALTER TABLE catalog_item ADD COLUMN IF NOT EXISTS hole_number int;

COMMENT ON COLUMN catalog_item.hole_number IS
  'When set, this item shows as a buy card on that hole in the play app scorecard.';

-- 2. Increment-or-insert so check-in sees ONE line with a qty --
--    (a row per tap is what made raffle tickets read as "13 sales")
CREATE OR REPLACE FUNCTION add_hole_purchase(
  p_team_id         uuid,
  p_catalog_item_id uuid,
  p_qty             int DEFAULT 1
) RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_price numeric;
  v_id    uuid;
  v_qty   int;
BEGIN
  SELECT price INTO v_price
    FROM catalog_item
   WHERE id = p_catalog_item_id AND active = true;

  IF v_price IS NULL THEN
    RAISE EXCEPTION 'Catalog item % not found or inactive', p_catalog_item_id;
  END IF;

  -- Row lock stops a double-tap from creating two lines.
  SELECT id INTO v_id
    FROM purchase
   WHERE team_id = p_team_id
     AND catalog_item_id = p_catalog_item_id
     AND paid_status = 'unpaid'
   ORDER BY created_at
   LIMIT 1
   FOR UPDATE;

  IF v_id IS NULL THEN
    INSERT INTO purchase (team_id, catalog_item_id, quantity, amount, paid_status, channel)
    VALUES (p_team_id, p_catalog_item_id, GREATEST(p_qty, 1), v_price, 'unpaid', 'during_round')
    RETURNING quantity INTO v_qty;
  ELSE
    UPDATE purchase
       SET quantity = quantity + GREATEST(p_qty, 1)
     WHERE id = v_id
    RETURNING quantity INTO v_qty;
  END IF;

  RETURN v_qty;
END;
$$;

GRANT EXECUTE ON FUNCTION add_hole_purchase(uuid, uuid, int) TO anon, authenticated;

-- 3. Remove a shot, for a mis-tap ------------------------------
CREATE OR REPLACE FUNCTION remove_hole_purchase(
  p_team_id         uuid,
  p_catalog_item_id uuid
) RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id  uuid;
  v_qty int;
BEGIN
  SELECT id, quantity INTO v_id, v_qty
    FROM purchase
   WHERE team_id = p_team_id
     AND catalog_item_id = p_catalog_item_id
     AND paid_status = 'unpaid'
   ORDER BY created_at
   LIMIT 1
   FOR UPDATE;

  IF v_id IS NULL THEN RETURN 0; END IF;

  -- Last one drops the line entirely rather than leaving a $0 row.
  IF v_qty <= 1 THEN
    DELETE FROM purchase WHERE id = v_id;
    RETURN 0;
  END IF;

  UPDATE purchase SET quantity = quantity - 1 WHERE id = v_id RETURNING quantity INTO v_qty;
  RETURN v_qty;
END;
$$;

GRANT EXECUTE ON FUNCTION remove_hole_purchase(uuid, uuid) TO anon, authenticated;

-- 4. The Bucket Golf item --------------------------------------
INSERT INTO catalog_item
  (event_id, name, price, unit, channels, active, description,
   per_person, sort_order, tag, allow_multiple, hole_number)
SELECT
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'Bucket Golf Challenge', 5, 'shot',
  '{during_round,check_in}'::purchase_channel[], true,
  'Hole 1. $5 a shot, no cap. Closest bucket takes 1 stroke off this hole, the middle takes 2, the farthest takes 3.',
  false, 10, 'bucket_golf', true, 1
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_item
   WHERE event_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND tag = 'bucket_golf'
);

-- 5. Let the admin Catalog tab set the hole --------------------
DROP FUNCTION IF EXISTS save_catalog_item(uuid, text, numeric, text, boolean, boolean, boolean);

CREATE OR REPLACE FUNCTION save_catalog_item(
  p_id             uuid,
  p_name           text,
  p_price          numeric,
  p_description    text,
  p_active         boolean,
  p_per_person     boolean,
  p_allow_multiple boolean DEFAULT false,
  p_hole_number    int     DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  IF p_id IS NULL THEN
    INSERT INTO catalog_item
      (event_id, name, price, description, active, per_person, allow_multiple,
       channels, unit, hole_number)
    VALUES (
      'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      p_name, p_price, p_description, p_active, p_per_person, p_allow_multiple,
      '{signup,check_in}'::purchase_channel[], 'each', p_hole_number
    )
    RETURNING id INTO v_id;
    RETURN v_id;
  ELSE
    UPDATE catalog_item
       SET name = p_name, price = p_price, description = p_description,
           active = p_active, per_person = p_per_person,
           allow_multiple = p_allow_multiple, hole_number = p_hole_number
     WHERE id = p_id;
    RETURN p_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION save_catalog_item(uuid, text, numeric, text, boolean, boolean, boolean, int) TO anon, authenticated;
