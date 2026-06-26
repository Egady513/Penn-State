-- ── Fix save_sponsor: cast tier text → sponsor_tier enum ───────
-- Run in Supabase SQL Editor

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
  v_id   uuid;
  v_tier sponsor_tier;
BEGIN
  -- Cast text to enum; treat blank/unknown as NULL
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
      (SELECT id FROM event LIMIT 1),
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

-- Ensure logo_url column exists (safe to run even if it already does)
ALTER TABLE sponsor ADD COLUMN IF NOT EXISTS logo_url text;
