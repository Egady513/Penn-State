-- ============================================================
-- Registrants who opted to cover the processing fee were being
-- charged for it, but the money was never counted as income.
-- registration.fee_coverage_amount was in no category at all.
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
  -- NEW: what registrants chipped in to cover card processing.
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
