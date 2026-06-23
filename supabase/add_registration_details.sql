-- ============================================================
-- Registration overhaul — run in Supabase SQL Editor
-- Adds golfer skill level + a separate donation amount so the
-- money raised can be itemized (registrations / add-ons / donations).
-- Safe to run on a live DB (IF NOT EXISTS guards).
-- ============================================================

-- 1. Per-golfer skill level (optional)
alter table player
  add column if not exists skill_level text;

-- 2. Separate the donation from the registration fee.
--    fee_amount now holds the BASE registration fee only; add-ons live
--    in the purchase table; donations live here.
alter table registration
  add column if not exists donation_amount numeric(10,2) not null default 0;

-- 3. Live "money raised" total — a security-definer function so the public
--    site + player app can show the aggregate WITHOUT exposing any row data.
--    Sums: base registration fees + add-on purchases + donations.
create or replace function total_raised()
returns numeric
language sql
security definer
set search_path = public
as $$
  select
    coalesce((select sum(fee_amount)      from registration), 0)
  + coalesce((select sum(donation_amount) from registration), 0)
  + coalesce((select sum(amount)          from purchase), 0);
$$;

-- Allow the anon (public) role to call it
grant execute on function total_raised() to anon, authenticated;
