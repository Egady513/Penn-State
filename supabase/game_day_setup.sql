-- ── Hole sponsor fields on team ────────────────────────────────────────
-- Stores the display name + optional logo URL for hole sponsors, collected
-- during registration. Used by the webhook instead of the raw team name.
ALTER TABLE team ADD COLUMN IF NOT EXISTS hole_sponsor_name text;
ALTER TABLE team ADD COLUMN IF NOT EXISTS hole_sponsor_logo_url text;

-- ── RPC: update a player's email ────────────────────────────────────────
-- Called from Admin → Teams & Registrations when correcting a bad email.
CREATE OR REPLACE FUNCTION set_player_email(
  p_player_id uuid,
  p_email     text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE player SET email = p_email WHERE id = p_player_id;
END;
$$;
GRANT EXECUTE ON FUNCTION set_player_email(uuid, text) TO anon;

-- ── RPC: create game-day purchase rows ──────────────────────────────────
-- Used by the play-app shop to create itemized purchase rows before
-- launching a Stripe Checkout for a team that is already registered.
-- Returns the inserted purchase IDs so the checkout can store them in
-- Stripe metadata and the webhook only marks those rows paid.
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
    'game_day',
    NULL
  FROM jsonb_array_elements(p_items) AS item
  RETURNING purchase.id;
END;
$$;
GRANT EXECUTE ON FUNCTION create_game_day_purchases(uuid, jsonb) TO anon;
