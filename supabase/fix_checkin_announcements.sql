-- ============================================================
-- Fixes: check-in purchase enum, paid-status cast, and real
-- announcement persistence. Run once in the Supabase SQL editor.
-- ============================================================

-- 1 ── add_checkin_purchase: 'checkin' was NOT a valid purchase_channel
--      enum value ('signup','check_in','during_round'), so adding an item
--      to a team's tab at the tent failed every time. Use 'check_in'.
CREATE OR REPLACE FUNCTION add_checkin_purchase(
  p_team_id         uuid,
  p_catalog_item_id uuid,
  p_player_id       uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_price numeric;
  v_id    uuid;
BEGIN
  SELECT price INTO v_price FROM catalog_item WHERE id = p_catalog_item_id;
  INSERT INTO purchase (catalog_item_id, team_id, player_id, quantity, amount, paid_status, channel)
  VALUES (p_catalog_item_id, p_team_id, p_player_id, 1, v_price, 'unpaid', 'check_in')
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$;
GRANT EXECUTE ON FUNCTION add_checkin_purchase(uuid, uuid, uuid) TO anon, authenticated;

-- 2 ── set_purchase_paid_status: cast to the payment_status enum (not text)
CREATE OR REPLACE FUNCTION set_purchase_paid_status(p_purchase_id uuid, p_paid boolean)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE purchase
  SET paid_status = (CASE WHEN p_paid THEN 'paid' ELSE 'unpaid' END)::payment_status
  WHERE id = p_purchase_id;
END; $$;
GRANT EXECUTE ON FUNCTION set_purchase_paid_status(uuid, boolean) TO anon, authenticated;

-- Make sure the arrival toggle is callable by the (unauthenticated) admin client too
GRANT EXECUTE ON FUNCTION set_player_arrived(uuid, boolean) TO anon, authenticated;

-- 3 ── Announcement persistence ─────────────────────────────────────────
-- The admin Announcements page only had local React state — nothing was
-- written to the DB, so the player app never saw posts. These SECURITY
-- DEFINER RPCs let the (anon) admin client create/pin/delete real rows.
CREATE OR REPLACE FUNCTION post_announcement(p_event_id uuid, p_message text, p_pinned boolean DEFAULT false)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO announcement (event_id, message, pinned)
  VALUES (p_event_id, p_message, p_pinned)
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$;
GRANT EXECUTE ON FUNCTION post_announcement(uuid, text, boolean) TO anon, authenticated;

CREATE OR REPLACE FUNCTION set_announcement_pinned(p_id uuid, p_pinned boolean)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN UPDATE announcement SET pinned = p_pinned WHERE id = p_id; END; $$;
GRANT EXECUTE ON FUNCTION set_announcement_pinned(uuid, boolean) TO anon, authenticated;

CREATE OR REPLACE FUNCTION delete_announcement(p_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN DELETE FROM announcement WHERE id = p_id; END; $$;
GRANT EXECUTE ON FUNCTION delete_announcement(uuid) TO anon, authenticated;
