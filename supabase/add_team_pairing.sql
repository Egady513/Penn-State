-- ============================================================
-- Team pairing + start hole — run in Supabase SQL Editor
-- Lets you pair teams (a shared label) and set each team's start hole
-- directly from the admin Teams page, without the foursome/group plumbing.
-- ============================================================

alter table team add column if not exists start_hole int;
alter table team add column if not exists pairing    text;

create or replace function set_team_assignment(p_team_id uuid, p_start_hole int, p_pairing text)
returns void
language sql
security definer
set search_path = public
as $$
  update team
    set start_hole = p_start_hole,
        pairing    = nullif(btrim(p_pairing), '')
    where id = p_team_id;
$$;

grant execute on function set_team_assignment(uuid, int, text) to anon, authenticated;
