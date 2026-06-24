-- ============================================================
-- Money raised = PAID money only — run in Supabase SQL Editor
-- Previously counted every registration (incl. unpaid pledges), which is
-- why an abandoned checkout showed up in the total. Now it only sums money
-- that's actually been paid (Stripe webhook flips rows to 'paid').
-- ============================================================

create or replace function total_raised()
returns numeric
language sql
security definer
set search_path = public
as $$
  select
    coalesce((select sum(fee_amount)      from registration where payment_status = 'paid'), 0)
  + coalesce((select sum(donation_amount) from registration where payment_status = 'paid'), 0)
  + coalesce((select sum(amount)          from purchase     where paid_status   = 'paid'), 0);
$$;

grant execute on function total_raised() to anon, authenticated;
