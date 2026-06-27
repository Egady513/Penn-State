-- ============================================================
-- Fix save_catalog_item to persist allow_multiple, and fix
-- sort_order so raffle items always sort to the bottom.
-- Safe to run on live DB — CREATE OR REPLACE + UPDATE are idempotent.
-- ============================================================

-- 1. Rebuild save_catalog_item with allow_multiple support
CREATE OR REPLACE FUNCTION save_catalog_item(
  p_id             uuid,
  p_name           text,
  p_price          numeric,
  p_description    text,
  p_active         boolean,
  p_per_person     boolean,
  p_allow_multiple boolean DEFAULT false
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  IF p_id IS NULL THEN
    INSERT INTO catalog_item
      (event_id, name, price, description, active, per_person, allow_multiple, channels, unit)
    VALUES (
      'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      p_name, p_price, p_description, p_active, p_per_person, p_allow_multiple,
      '{signup,check_in}'::purchase_channel[], 'each'
    )
    RETURNING id INTO v_id;
    RETURN v_id;
  ELSE
    UPDATE catalog_item
       SET name = p_name, price = p_price, description = p_description,
           active = p_active, per_person = p_per_person, allow_multiple = p_allow_multiple
     WHERE id = p_id;
    RETURN p_id;
  END IF;
END;
$$;

-- Old 6-param signature is replaced; grant on the new 7-param signature.
GRANT EXECUTE ON FUNCTION save_catalog_item(uuid, text, numeric, text, boolean, boolean, boolean) TO anon, authenticated;

-- 2. Fix existing raffle items in the DB: per_person=true, allow_multiple=true,
--    high sort_order so they always appear at the bottom of the add-on list.
UPDATE catalog_item
   SET per_person = true, allow_multiple = true, sort_order = 90
 WHERE event_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
   AND name ILIKE '%raffle%';
