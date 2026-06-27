-- ── Fix total_raised to multiply amount × quantity ─────────────────────
-- Previously summed only amount (per-unit price) which undercounted any
-- purchase where quantity > 1 (e.g. 2 gimme ropes bought together).
-- Re-run this in the Supabase SQL editor.

CREATE OR REPLACE FUNCTION total_raised()
RETURNS numeric
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE((SELECT SUM(fee_amount)             FROM registration WHERE payment_status = 'paid'), 0)
  + COALESCE((SELECT SUM(donation_amount)        FROM registration WHERE payment_status = 'paid'), 0)
  + COALESCE((SELECT SUM(amount * COALESCE(quantity, 1)) FROM purchase WHERE paid_status = 'paid'), 0);
$$;

GRANT EXECUTE ON FUNCTION total_raised() TO anon, authenticated;
