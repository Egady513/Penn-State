-- ── Check-in flow ─────────────────────────────────────────────────
-- Run in Supabase SQL Editor

-- 1. Track golfer arrival
ALTER TABLE player ADD COLUMN IF NOT EXISTS arrived_at timestamptz;

-- 2. RPC: mark a player as arrived or un-arrived
CREATE OR REPLACE FUNCTION set_player_arrived(p_player_id uuid, p_arrived boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE player
  SET arrived_at = CASE WHEN p_arrived THEN now() ELSE NULL END
  WHERE id = p_player_id;
END;
$$;

-- 3. RPC: add a catalog item purchase at check-in
CREATE OR REPLACE FUNCTION add_checkin_purchase(
  p_team_id         uuid,
  p_catalog_item_id uuid,
  p_player_id       uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_price numeric;
  v_id    uuid;
BEGIN
  SELECT price INTO v_price FROM catalog_item WHERE id = p_catalog_item_id;

  INSERT INTO purchase (catalog_item_id, team_id, player_id, quantity, amount, paid_status, channel)
  VALUES (p_catalog_item_id, p_team_id, p_player_id, 1, v_price, 'unpaid', 'checkin')
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- 4. RPC: toggle a single purchase between paid/unpaid
CREATE OR REPLACE FUNCTION set_purchase_paid_status(p_purchase_id uuid, p_paid boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE purchase
  SET paid_status = CASE WHEN p_paid THEN 'paid'::text ELSE 'unpaid'::text END
  WHERE id = p_purchase_id;
END;
$$;
