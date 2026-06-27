-- ── Fix save_sponsor RPC and ensure anon can call it ──────────────────
-- The fix_save_sponsor.sql added the logo_url parameter but may not have
-- included the GRANT. This drops any stale 7-param overload and ensures
-- only the 8-param version (with logo_url) exists, with proper grants.

-- Drop the old 7-param version if it still exists alongside the new one.
DROP FUNCTION IF EXISTS save_sponsor(uuid, text, text, text, int, numeric, boolean);

-- Recreate the full 8-param version cleanly.
CREATE OR REPLACE FUNCTION save_sponsor(
  p_id               uuid,
  p_name             text,
  p_tier             text        DEFAULT '',
  p_sponsorship_type text        DEFAULT '',
  p_hole_number      int         DEFAULT NULL,
  p_amount           numeric     DEFAULT 0,
  p_active           boolean     DEFAULT true,
  p_logo_url         text        DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id   uuid;
  v_tier sponsor_tier;
BEGIN
  BEGIN
    IF p_tier IS NOT NULL AND p_tier <> '' THEN
      v_tier := p_tier::sponsor_tier;
    ELSE
      v_tier := NULL;
    END IF;
  EXCEPTION WHEN invalid_text_representation THEN
    v_tier := NULL;
  END;

  IF p_id IS NULL THEN
    INSERT INTO sponsor (event_id, name, tier, sponsorship_type, hole_number, amount, active, logo_url)
    VALUES (
      'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      p_name, v_tier, p_sponsorship_type, p_hole_number, p_amount, p_active, p_logo_url
    )
    RETURNING id INTO v_id;
  ELSE
    UPDATE sponsor
    SET name             = p_name,
        tier             = v_tier,
        sponsorship_type = p_sponsorship_type,
        hole_number      = p_hole_number,
        amount           = p_amount,
        active           = p_active,
        logo_url         = p_logo_url
    WHERE id = p_id;
    v_id := p_id;
  END IF;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION save_sponsor(uuid, text, text, text, int, numeric, boolean, text) TO anon, authenticated;
