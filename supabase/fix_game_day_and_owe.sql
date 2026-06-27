-- ============================================================
-- Fixes for game-day shop + owe-page card payments
-- Run this whole file ONCE in the Supabase SQL editor.
-- ============================================================

-- 1 ── Mulligan paid flag ────────────────────────────────────────────────
-- Lets a team settle their mulligan tab by card from the play app.
ALTER TABLE mulligan ADD COLUMN IF NOT EXISTS paid boolean NOT NULL DEFAULT false;

-- 2 ── Fix create_game_day_purchases ─────────────────────────────────────
-- The first version inserted channel = 'game_day', which is NOT a valid
-- purchase_channel enum value, so the shop checkout failed at the DB. This
-- recreates it with 'during_round' (a real enum value for on-course buys).
CREATE OR REPLACE FUNCTION create_game_day_purchases(
  p_team_id uuid,
  p_items    jsonb   -- [{ "catalog_item_id": uuid, "quantity": int, "amount": numeric }]
) RETURNS TABLE(id uuid)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  INSERT INTO purchase (team_id, catalog_item_id, quantity, amount, paid_status, channel, player_id)
  SELECT
    p_team_id,
    (item->>'catalog_item_id')::uuid,
    (item->>'quantity')::int,
    (item->>'amount')::numeric,
    'unpaid',
    'during_round',
    NULL
  FROM jsonb_array_elements(p_items) AS item
  RETURNING purchase.id;
END;
$$;
GRANT EXECUTE ON FUNCTION create_game_day_purchases(uuid, jsonb) TO anon;
