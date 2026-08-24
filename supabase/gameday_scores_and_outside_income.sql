-- ============================================================
-- Game-day prep. Run ONCE in the Supabase SQL editor.
--   1. Re-consolidate the stray per-team greens-fee / drink-ticket rows
--      (safe to run repeatedly).
--   2. outside_income — cash + Venmo collected on the day, so all money
--      raised lives in one tool.
--   3. team.front_nine / back_nine — so scores can be entered from admin
--      for teams that never touched the player app.
-- ============================================================

-- 1 ── Fold stray auto-expense rows back into one line each ──────────
DO $$
DECLARE v_total numeric;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO v_total
  FROM expense
  WHERE event_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND category = 'greens_fees';

  DELETE FROM expense
  WHERE event_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND category = 'greens_fees';

  IF v_total > 0 THEN
    INSERT INTO expense (event_id, description, amount, category)
    VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Greens fees ($75 × golfers registered)', v_total, 'greens_fees');
  END IF;
END $$;

DO $$
DECLARE v_total numeric;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO v_total
  FROM expense
  WHERE event_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
    AND category = 'other' AND description LIKE 'Drink tickets%';

  DELETE FROM expense
  WHERE event_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
    AND category = 'other' AND description LIKE 'Drink tickets%';

  IF v_total > 0 THEN
    INSERT INTO expense (event_id, description, amount, category)
    VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Drink tickets ($3 × golfers registered)', v_total, 'other');
  END IF;
END $$;

-- 2 ── Outside income (cash / Venmo / check taken on the day) ────────
CREATE TABLE IF NOT EXISTS outside_income (
  id          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid          NOT NULL REFERENCES event(id) ON DELETE CASCADE,
  description text          NOT NULL,
  amount      numeric(10,2) NOT NULL,
  method      text          NOT NULL DEFAULT 'cash',
  created_at  timestamptz   NOT NULL DEFAULT now()
);

ALTER TABLE outside_income ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read outside_income" ON outside_income;
CREATE POLICY "public read outside_income" ON outside_income
  FOR SELECT TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION list_outside_income()
RETURNS TABLE(id uuid, description text, amount numeric, method text, created_at timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT id, description, amount, method, created_at
  FROM outside_income
  WHERE event_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  ORDER BY created_at DESC;
$$;
GRANT EXECUTE ON FUNCTION list_outside_income() TO anon, authenticated;

CREATE OR REPLACE FUNCTION save_outside_income(
  p_id uuid, p_description text, p_amount numeric, p_method text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  IF p_id IS NULL THEN
    INSERT INTO outside_income (event_id, description, amount, method)
    VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', p_description, p_amount, COALESCE(NULLIF(p_method,''),'cash'))
    RETURNING id INTO v_id;
    RETURN v_id;
  ELSE
    UPDATE outside_income
      SET description = p_description, amount = p_amount,
          method = COALESCE(NULLIF(p_method,''),'cash')
      WHERE id = p_id;
    RETURN p_id;
  END IF;
END; $$;
GRANT EXECUTE ON FUNCTION save_outside_income(uuid, text, numeric, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION delete_outside_income(p_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN DELETE FROM outside_income WHERE id = p_id; END; $$;
GRANT EXECUTE ON FUNCTION delete_outside_income(uuid) TO anon, authenticated;

-- Roll outside income into revenue_breakdown so gross/net pick it up
-- everywhere automatically (Revenue tab, total_raised, homepage chip).
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
  SELECT 'outside', COUNT(*)::int, COALESCE(SUM(amount),0)
    FROM outside_income
  UNION ALL
  SELECT 'expenses', COUNT(*)::int, COALESCE(SUM(amount),0)
    FROM expense;
$$;
GRANT EXECUTE ON FUNCTION revenue_breakdown() TO anon, authenticated;

-- 3 ── Admin-entered 9-hole totals ───────────────────────────────────
ALTER TABLE team ADD COLUMN IF NOT EXISTS front_nine int;
ALTER TABLE team ADD COLUMN IF NOT EXISTS back_nine  int;

CREATE OR REPLACE FUNCTION save_team_nines(
  p_team_id uuid, p_front int, p_back int
) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE team SET front_nine = p_front, back_nine = p_back WHERE id = p_team_id;
$$;
GRANT EXECUTE ON FUNCTION save_team_nines(uuid, int, int) TO anon, authenticated;
