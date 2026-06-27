-- ============================================================
-- Day-of tools: team balances (who owes what), revenue breakdown,
-- and expense entry. Run once in the Supabase SQL editor.
-- All SECURITY DEFINER so the unauthenticated admin client can use them.
-- ============================================================

-- ── Who owes what (per team, unpaid only components) ────────────────────
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

-- ── Revenue breakdown (one row per category: count + dollars) ───────────
-- Hole-sponsor money is counted ONCE, via the sponsor table (sponsorships),
-- so hole_sponsor/discount purchases are excluded here to avoid double count.
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

-- ── Expense entry (the expense table had no UI / anon access) ───────────
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
