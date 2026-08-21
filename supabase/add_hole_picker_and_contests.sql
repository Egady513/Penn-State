-- ============================================================
-- 1) Let a hole-sponsor registrant pick which hole they want.
-- 2) Give admin a real (non-mock) way to assign CTP / Long Drive /
--    a custom challenge per hole — drives the live day-of scorecard.
-- Safe to run on the live DB: additive columns + upserts only.
-- ============================================================

-- 1 ── Registrant's chosen hole number, stored on the team ────
alter table team
  add column if not exists hole_sponsor_hole int
  check (hole_sponsor_hole is null or hole_sponsor_hole between 1 and 18);

-- 2 ── Optional custom challenge label per hole (beyond CTP/LD) ─
alter table hole
  add column if not exists contest_label text;

-- 3 ── Make sure all 18 holes exist for this event (Beckett Ridge
--      pars). Does NOT touch contest_type on existing rows — only
--      inserts holes that are missing.
insert into hole (event_id, number, par, contest_type)
select 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', n, p, 'none'
from (values
  (1,5),(2,4),(3,4),(4,3),(5,5),(6,3),(7,4),(8,4),(9,4),
  (10,3),(11,4),(12,5),(13,3),(14,5),(15,4),(16,3),(17,5),(18,4)
) as v(n, p)
on conflict (event_id, number) do nothing;

-- 4 ── Admin write RPC for the Course page (anon-granted, same
--      pattern as every other admin save RPC — real auth is still
--      pending, see backlog B5).
create or replace function save_hole_contest(
  p_hole_id      uuid,
  p_contest_type text,
  p_contest_label text
) returns void
language plpgsql security definer set search_path = public as $$
begin
  update hole
    set contest_type  = p_contest_type::contest_type,
        contest_label = nullif(btrim(coalesce(p_contest_label, '')), '')
    where id = p_hole_id;
end; $$;

grant execute on function save_hole_contest(uuid, text, text) to anon, authenticated;
