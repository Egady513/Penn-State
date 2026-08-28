-- ============================================================
-- Make "Collected through the app" tie to Stripe gross volume.
--
-- Hole sponsorships bought at registration DID go through Stripe, but
-- were counted from the hand-typed sponsor table instead, which left the
-- app figure $255 short of Stripe and silently dropped the -$15 twosome
-- discount. Count them from the real purchase rows instead, and let the
-- sponsor table cover only money that never touched the app.
--
-- Includes the fee_coverage category (registrants who covered card fees
-- were charged but never counted).
--
-- Golf tables only. Safe to re-run.
-- ============================================================

CREATE OR REPLACE FUNCTION revenue_breakdown()
RETURNS TABLE(category text, item_count int, dollars numeric)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT 'registration', COUNT(*)::int, COALESCE(SUM(fee_amount),0)
    FROM registration WHERE payment_status = 'paid'
  UNION ALL
  SELECT 'donations', COUNT(*) FILTER (WHERE donation_amount > 0)::int, COALESCE(SUM(donation_amount),0)
    FROM registration WHERE payment_status = 'paid'
  UNION ALL
  SELECT 'fee_coverage', COUNT(*) FILTER (WHERE fee_coverage_amount > 0)::int,
         COALESCE(SUM(fee_coverage_amount),0)
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
  -- NEW: hole sponsorships actually charged through the app, net of the
  -- twosome discount. This is the piece that was missing from the Stripe
  -- figure.
  SELECT 'hole_sponsorships', COUNT(*) FILTER (WHERE ci.tag = 'hole_sponsor')::int,
         COALESCE(SUM(p.amount * COALESCE(p.quantity,1)),0)
    FROM purchase p JOIN catalog_item ci ON ci.id = p.catalog_item_id
    WHERE p.paid_status = 'paid'
      AND ci.tag IN ('hole_sponsor','hole_sponsor_discount')
  UNION ALL
  -- Sponsor money that did NOT come through the app: the typed total less
  -- whatever was already charged as a hole sponsorship above.
  SELECT 'sponsorships', COUNT(*)::int,
         GREATEST(
           COALESCE((SELECT SUM(amount) FROM sponsor WHERE active = true), 0)
           - COALESCE((SELECT SUM(p.amount * COALESCE(p.quantity,1))
                         FROM purchase p JOIN catalog_item ci ON ci.id = p.catalog_item_id
                        WHERE p.paid_status = 'paid' AND ci.tag = 'hole_sponsor'), 0),
           0)
    FROM sponsor WHERE active = true
  UNION ALL
  SELECT 'outside', COUNT(*)::int, COALESCE(SUM(amount),0)
    FROM outside_income
  UNION ALL
  SELECT 'expenses', COUNT(*)::int, COALESCE(SUM(amount),0)
    FROM expense;
$$;

GRANT EXECUTE ON FUNCTION revenue_breakdown() TO anon, authenticated;
