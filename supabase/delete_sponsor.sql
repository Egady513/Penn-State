-- ── delete_sponsor RPC ─────────────────────────────────────────
-- Run in Supabase SQL Editor

CREATE OR REPLACE FUNCTION delete_sponsor(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM sponsor WHERE id = p_id;
END;
$$;
