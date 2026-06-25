-- ============================================================
-- Mark a team paid/unpaid from admin — run in Supabase SQL Editor
-- Flips the team + its registration + its purchases together, so the
-- money-raised total and "paid" status stay consistent. Used to reconcile
-- Venmo and any other manual payments.
-- ============================================================

create or replace function set_team_paid(p_team_id uuid, p_paid boolean)
returns void
language sql
security definer
set search_path = public
as $$
  update team
    set payment_status = (case when p_paid then 'paid' else 'unpaid' end)::payment_status
    where id = p_team_id;
  update registration
    set payment_status = (case when p_paid then 'paid' else 'unpaid' end)::payment_status
    where team_id = p_team_id;
  update purchase
    set paid_status = (case when p_paid then 'paid' else 'unpaid' end)::payment_status
    where team_id = p_team_id;
$$;

grant execute on function set_team_paid(uuid, boolean) to anon, authenticated;
