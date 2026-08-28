-- ============================================================
-- 1. Remove an add-on added by mistake at check-in.
--    A plain client DELETE returns 204 while RLS filters every row,
--    so the item never actually went away.
-- 2. Record HOW something was paid, so "collected through the app"
--    can stay a Stripe figure once cash starts coming in at the tent.
-- Golf tables only. Safe to re-run.
-- ============================================================

CREATE OR REPLACE FUNCTION delete_purchase(p_purchase_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM purchase WHERE id = p_purchase_id;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_purchase(uuid) TO anon, authenticated;

-- Marking paid at the tent means cash or Venmo: Stripe never saw it.
DROP FUNCTION IF EXISTS set_purchase_paid_status(uuid, boolean);

CREATE OR REPLACE FUNCTION set_purchase_paid_status(
  p_purchase_id uuid,
  p_paid        boolean,
  p_method      text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE purchase
     SET paid_status = (CASE WHEN p_paid THEN 'paid' ELSE 'unpaid' END)::payment_status,
         payment_method = CASE
           WHEN p_paid THEN COALESCE(p_method, 'cash')::payment_method
           ELSE NULL
         END
   WHERE id = p_purchase_id;
END;
$$;

GRANT EXECUTE ON FUNCTION set_purchase_paid_status(uuid, boolean, text) TO anon, authenticated;

-- Same for mulligans settled at the tent.
CREATE OR REPLACE FUNCTION mark_mulligans_paid(p_team_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE mulligan SET paid = true WHERE team_id = p_team_id AND paid = false;
END;
$$;

GRANT EXECUTE ON FUNCTION mark_mulligans_paid(uuid) TO anon, authenticated;

-- Card volume, so the Revenue tab can estimate Stripe's cut.
-- Anything settled at the tent carries a cash/venmo/check method and is
-- excluded; registrations always went through Stripe.
CREATE OR REPLACE FUNCTION card_volume()
RETURNS TABLE(volume numeric, registrations int, purchases int)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT
    (SELECT COALESCE(SUM(fee_amount + COALESCE(donation_amount,0) + COALESCE(fee_coverage_amount,0)),0)
       FROM registration WHERE payment_status = 'paid')
  + (SELECT COALESCE(SUM(amount * COALESCE(quantity,1)),0)
       FROM purchase
      WHERE paid_status = 'paid'
        AND (payment_method IS NULL OR payment_method NOT IN ('cash','venmo','other'))),
    (SELECT COUNT(*)::int FROM registration WHERE payment_status = 'paid'),
    (SELECT COUNT(*)::int FROM purchase
      WHERE paid_status = 'paid'
        AND (payment_method IS NULL OR payment_method NOT IN ('cash','venmo','other')));
$$;

GRANT EXECUTE ON FUNCTION card_volume() TO anon, authenticated;
