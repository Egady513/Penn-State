-- ============================================================
-- Fix: greens-fee and drink-ticket expenses were being inserted as a
-- NEW row per team on every registration, flooding the Revenue tab
-- with dozens of near-duplicate rows. This:
--   1. Consolidates all existing per-team rows into ONE aggregate row
--      per category (sums them, deletes the duplicates).
--   2. Adds an atomic increment-or-insert RPC the webhook now calls
--      instead of inserting a fresh row every time.
-- Safe to run once on the live DB — only touches rows this feature
-- created (greens_fees category, or 'other' rows whose description
-- starts with "Drink tickets"). Any other manually-added expense is
-- left untouched.
-- ============================================================

-- 1 ── Consolidate existing per-team greens-fee rows ────────────────
DO $$
DECLARE
  v_total numeric;
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

-- 2 ── Consolidate existing per-team drink-ticket rows ──────────────
DO $$
DECLARE
  v_total numeric;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO v_total
  FROM expense
  WHERE event_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
    AND category = 'other'
    AND description LIKE 'Drink tickets%';

  DELETE FROM expense
  WHERE event_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
    AND category = 'other'
    AND description LIKE 'Drink tickets%';

  IF v_total > 0 THEN
    INSERT INTO expense (event_id, description, amount, category)
    VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Drink tickets ($3 × golfers registered)', v_total, 'other');
  END IF;
END $$;

-- 3 ── Atomic increment-or-insert, used by the webhook from now on ──
-- Finds the one row matching (event_id, category, description) and
-- adds to its amount; creates it on the first call. The UPDATE is a
-- single atomic statement, so two webhooks firing at the same moment
-- can't stomp on each other's increment (no lost updates).
CREATE OR REPLACE FUNCTION upsert_aggregate_expense(
  p_event_id      uuid,
  p_category      text,
  p_description   text,
  p_delta_amount  numeric
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id uuid;
BEGIN
  UPDATE expense
    SET amount = amount + p_delta_amount
    WHERE event_id = p_event_id
      AND category = p_category::expense_category
      AND description = p_description
    RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    INSERT INTO expense (event_id, description, amount, category)
    VALUES (p_event_id, p_description, p_delta_amount, p_category::expense_category);
  END IF;
END; $$;

GRANT EXECUTE ON FUNCTION upsert_aggregate_expense(uuid, text, text, numeric) TO anon, authenticated;
