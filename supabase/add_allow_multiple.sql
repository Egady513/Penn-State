-- ── Multi-buy catalog flag ──────────────────────────────────────
-- Run in Supabase SQL Editor.
-- Adds an `allow_multiple` flag on catalog_item so the registration form can
-- show a quantity stepper (− N +) instead of a checkbox for items where the
-- registrant can purchase more than one (e.g. Advantage card: opponent's drive).

ALTER TABLE catalog_item ADD COLUMN IF NOT EXISTS allow_multiple boolean NOT NULL DEFAULT false;

-- Replace the save_catalog_item RPC to accept the new flag.
-- (Drop the old signature first so re-running this script is idempotent.)
DROP FUNCTION IF EXISTS save_catalog_item(uuid, text, numeric, text, boolean, boolean);

CREATE OR REPLACE FUNCTION save_catalog_item(
  p_id             uuid,
  p_name           text,
  p_price          numeric,
  p_description    text,
  p_active         boolean,
  p_per_person     boolean,
  p_allow_multiple boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_id IS NULL THEN
    INSERT INTO catalog_item (event_id, name, price, description, active, per_person, allow_multiple, channels, unit)
    VALUES (
      (SELECT id FROM event LIMIT 1),
      p_name, p_price, p_description, p_active, p_per_person, p_allow_multiple,
      ARRAY['signup', 'check_in']::purchase_channel[], 'each'
    )
    RETURNING id INTO v_id;
  ELSE
    UPDATE catalog_item
    SET name           = p_name,
        price          = p_price,
        description    = p_description,
        active         = p_active,
        per_person     = p_per_person,
        allow_multiple = p_allow_multiple
    WHERE id = p_id;
    v_id := p_id;
  END IF;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION save_catalog_item(uuid, text, numeric, text, boolean, boolean, boolean) TO anon, authenticated;

-- Pre-flag "Advantage card: opponent's drive" since multi-buy was confirmed
-- (per Eddie: "in previous years we were able to purchase as many as we wanted").
UPDATE catalog_item
SET allow_multiple = true
WHERE event_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  AND name ILIKE '%opponent%drive%';
