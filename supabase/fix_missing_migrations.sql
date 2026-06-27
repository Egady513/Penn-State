-- ============================================================
-- Catch-up migration — safe to run even if individual files
-- were already applied. All statements are idempotent.
-- Run this entire file in the Supabase SQL editor.
-- ============================================================

-- 1 ── Mulligan paid flag (from fix_game_day_and_owe.sql) ────
ALTER TABLE mulligan ADD COLUMN IF NOT EXISTS paid boolean NOT NULL DEFAULT false;

-- 2 ── Fix create_game_day_purchases (channel = during_round) ─
CREATE OR REPLACE FUNCTION create_game_day_purchases(
  p_team_id uuid,
  p_items    jsonb
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

-- 3 ── Mark all unpaid mulligans paid for a team ─────────────
CREATE OR REPLACE FUNCTION mark_mulligans_paid(p_team_id uuid)
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE mulligan SET paid = true WHERE team_id = p_team_id AND paid = false;
$$;
GRANT EXECUTE ON FUNCTION mark_mulligans_paid(uuid) TO anon, authenticated;

-- 4 ── Who owes what ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION team_balances()
RETURNS TABLE(team_id uuid, team_name text, reg_unpaid numeric, purchases_unpaid numeric, mulligans_unpaid numeric)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT
    t.id,
    t.name,
    COALESCE((SELECT SUM(r.fee_amount + COALESCE(r.donation_amount,0)) FROM registration r
              WHERE r.team_id = t.id AND r.payment_status <> 'paid'), 0),
    COALESCE((SELECT SUM(p.amount * COALESCE(p.quantity,1)) FROM purchase p
              WHERE p.team_id = t.id AND p.paid_status <> 'paid'), 0),
    COALESCE((SELECT SUM(m.count) * 2 FROM mulligan m
              WHERE m.team_id = t.id AND m.paid = false), 0)
  FROM team t
  WHERE t.event_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  ORDER BY t.name;
$$;
GRANT EXECUTE ON FUNCTION team_balances() TO anon, authenticated;

-- 5 ── Revenue breakdown ──────────────────────────────────────
CREATE OR REPLACE FUNCTION revenue_breakdown()
RETURNS TABLE(category text, item_count int, dollars numeric)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT 'registration', COUNT(*)::int, COALESCE(SUM(fee_amount),0)
    FROM registration WHERE payment_status = 'paid'
  UNION ALL
  SELECT 'donations', COUNT(*) FILTER (WHERE donation_amount > 0)::int, COALESCE(SUM(donation_amount),0)
    FROM registration WHERE payment_status = 'paid'
  UNION ALL
  SELECT 'mulligans', COALESCE(SUM(count),0)::int, COALESCE(SUM(count),0) * 2
    FROM mulligan WHERE paid = true
  UNION ALL
  SELECT 'challenge', COUNT(*)::int, COALESCE(SUM(p.amount * COALESCE(p.quantity,1)),0)
    FROM purchase p JOIN catalog_item ci ON ci.id = p.catalog_item_id
    WHERE p.paid_status = 'paid' AND ci.tag IN ('ctp','ld')
  UNION ALL
  SELECT 'raffles', COALESCE(SUM(p.quantity),0)::int, COALESCE(SUM(p.amount * COALESCE(p.quantity,1)),0)
    FROM purchase p JOIN catalog_item ci ON ci.id = p.catalog_item_id
    WHERE p.paid_status = 'paid' AND ci.name ILIKE '%raffle%'
  UNION ALL
  SELECT 'other_addons', COALESCE(SUM(p.quantity),0)::int, COALESCE(SUM(p.amount * COALESCE(p.quantity,1)),0)
    FROM purchase p JOIN catalog_item ci ON ci.id = p.catalog_item_id
    WHERE p.paid_status = 'paid'
      AND COALESCE(ci.tag,'') NOT IN ('ctp','ld','hole_sponsor','hole_sponsor_discount','base')
      AND ci.name NOT ILIKE '%raffle%'
  UNION ALL
  SELECT 'sponsorships', COUNT(*)::int, COALESCE(SUM(amount),0)
    FROM sponsor WHERE active = true
  UNION ALL
  SELECT 'expenses', COUNT(*)::int, COALESCE(SUM(amount),0)
    FROM expense;
$$;
GRANT EXECUTE ON FUNCTION revenue_breakdown() TO anon, authenticated;

-- 6 ── Expense RPCs ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION list_expenses()
RETURNS TABLE(id uuid, description text, amount numeric, category text, created_at timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT id, description, amount, category::text, created_at FROM expense ORDER BY created_at DESC;
$$;
GRANT EXECUTE ON FUNCTION list_expenses() TO anon, authenticated;

CREATE OR REPLACE FUNCTION save_expense(p_id uuid, p_description text, p_amount numeric, p_category text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_id uuid; v_cat expense_category;
BEGIN
  v_cat := (CASE WHEN p_category = 'greens_fees' THEN 'greens_fees' ELSE 'other' END)::expense_category;
  IF p_id IS NULL THEN
    INSERT INTO expense (event_id, description, amount, category)
    VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', p_description, p_amount, v_cat)
    RETURNING id INTO v_id;
  ELSE
    UPDATE expense SET description = p_description, amount = p_amount, category = v_cat WHERE id = p_id;
    v_id := p_id;
  END IF;
  RETURN v_id;
END; $$;
GRANT EXECUTE ON FUNCTION save_expense(uuid, text, numeric, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION delete_expense(p_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN DELETE FROM expense WHERE id = p_id; END; $$;
GRANT EXECUTE ON FUNCTION delete_expense(uuid) TO anon, authenticated;

-- 7 ── Delete team ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION delete_team(p_team_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM purchase WHERE team_id = p_team_id;
  DELETE FROM team     WHERE id      = p_team_id;
END;
$$;
GRANT EXECUTE ON FUNCTION delete_team(uuid) TO anon, authenticated;

-- 8 ── Challenge participants ──────────────────────────────────
CREATE OR REPLACE FUNCTION challenge_participants()
RETURNS TABLE(player_name text, team_name text, contest text)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(pl.name, 'Whole team') AS player_name,
         t.name                          AS team_name,
         ci.tag                          AS contest
  FROM purchase pu
  JOIN catalog_item ci ON ci.id = pu.catalog_item_id
  JOIN team t          ON t.id  = pu.team_id
  LEFT JOIN player pl  ON pl.id = pu.player_id
  WHERE ci.tag IN ('ctp', 'ld')
    AND pu.paid_status = 'paid'
    AND t.event_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
$$;
GRANT EXECUTE ON FUNCTION challenge_participants() TO anon, authenticated;
