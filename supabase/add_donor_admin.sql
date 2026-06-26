-- ── Donor admin RPCs ──────────────────────────────────────────────
-- Run in Supabase SQL Editor

-- 1. Upsert a donor (insert if p_id is null, update otherwise)
CREATE OR REPLACE FUNCTION save_donor(
  p_id              uuid,
  p_event_id        uuid,
  p_name            text,
  p_donated_item    text,
  p_estimated_value numeric,
  p_logo_url        text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_id IS NULL THEN
    INSERT INTO donor (event_id, name, donated_item, estimated_value, logo_url)
    VALUES (p_event_id, p_name, p_donated_item, p_estimated_value, p_logo_url)
    RETURNING id INTO v_id;
  ELSE
    UPDATE donor
    SET name            = p_name,
        donated_item    = p_donated_item,
        estimated_value = p_estimated_value,
        logo_url        = p_logo_url
    WHERE id = p_id AND event_id = p_event_id;
    v_id := p_id;
  END IF;
  RETURN v_id;
END;
$$;

-- 2. Delete a donor
CREATE OR REPLACE FUNCTION delete_donor(p_id uuid, p_event_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM donor WHERE id = p_id AND event_id = p_event_id;
END;
$$;
