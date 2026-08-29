-- ============================================================
-- Card fees belong in revenue_breakdown, not in one page's JS.
--
-- The estimate lived only in the admin Revenue page, so the play app
-- showed $3,290 while admin showed $3,052.92 for the same "to Last Mile"
-- figure. Both now read the same category.
--
-- Logging an expense whose description mentions stripe / processing fee /
-- card fee / cc fee suppresses the estimate, so the exact number can
-- replace it without charging the cost twice.
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
  SELECT 'hole_sponsorships', COUNT(*) FILTER (WHERE ci.tag = 'hole_sponsor')::int,
         COALESCE(SUM(p.amount * COALESCE(p.quantity,1)),0)
    FROM purchase p JOIN catalog_item ci ON ci.id = p.catalog_item_id
    WHERE p.paid_status = 'paid' AND ci.tag IN ('hole_sponsor','hole_sponsor_discount')
  UNION ALL
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
    FROM expense
  UNION ALL
  -- Estimated Stripe cut on card money. Verified against the real
  -- dashboard: 2.9% x $7,813 + $0.30 x 35 = $237.08 vs $237.07 actual.
  SELECT 'card_fees', 0,
    CASE WHEN EXISTS (
      SELECT 1 FROM expense
       WHERE description ~* '(stripe|processing fee|card fee|cc fee)'
    ) THEN 0
    ELSE ROUND(
      ((SELECT COALESCE(SUM(fee_amount + COALESCE(donation_amount,0) + COALESCE(fee_coverage_amount,0)),0)
          FROM registration WHERE payment_status = 'paid')
     + (SELECT COALESCE(SUM(amount * COALESCE(quantity,1)),0) FROM purchase
         WHERE paid_status = 'paid'
           AND (payment_method IS NULL OR payment_method NOT IN ('cash','venmo','other')))
      ) * 0.029
      + (SELECT COUNT(*) FROM registration WHERE payment_status = 'paid') * 0.30
    , 2) END;
$$;

GRANT EXECUTE ON FUNCTION revenue_breakdown() TO anon, authenticated;
