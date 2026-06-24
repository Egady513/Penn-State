-- ============================================================
-- Game-day tracking — run in Supabase SQL Editor
-- Lets the player app show what a team bought (challenge + advantage
-- cards) and mark advantage cards as used.
-- ============================================================

-- 1. "Used" flag for advantage cards
alter table purchase add column if not exists used boolean not null default false;

-- 2. The player app (anon) needs to READ purchases to show status.
--    (Until now only insert/admin were allowed.)
drop policy if exists "public read purchase" on purchase;
create policy "public read purchase"
  on purchase for select to anon, authenticated using (true);

-- 3. Toggle a card's used flag — only that column, so it's safe to call
--    without a login (can't touch paid_status, amount, etc.).
create or replace function set_purchase_used(p_id uuid, p_used boolean)
returns void
language sql
security definer
set search_path = public
as $$
  update purchase set used = p_used where id = p_id;
$$;

grant execute on function set_purchase_used(uuid, boolean) to anon, authenticated;
