-- ── Add logo_url support to save_sponsor RPC ──────────────────────
-- Run in Supabase SQL Editor
-- This replaces the existing save_sponsor function to include logo_url.

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
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_id IS NULL THEN
    INSERT INTO sponsor (event_id, name, tier, sponsorship_type, hole_number, amount, active, logo_url)
    VALUES (
      (SELECT id FROM event LIMIT 1),  -- single-event app
      p_name, p_tier, p_sponsorship_type, p_hole_number, p_amount, p_active, p_logo_url
    )
    RETURNING id INTO v_id;
  ELSE
    UPDATE sponsor
    SET name             = p_name,
        tier             = p_tier,
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
