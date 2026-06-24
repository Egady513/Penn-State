-- ============================================================
-- Sponsors: categories + hole + admin editing — run in SQL Editor
-- Lets you classify each sponsor (hole / cart / putting green / custom),
-- assign a hole only when it's a hole sponsor, and edit it all from admin.
-- ============================================================

-- 1. Tier is now optional (not every sponsor fits Eagle/Birdie/Par)
alter table sponsor alter column tier drop not null;

-- 2. What the sponsor is sponsoring + the hole (only for hole sponsors)
alter table sponsor add column if not exists sponsorship_type text;       -- 'Hole', 'Cart', 'Putting Green Challenge', or anything custom
alter table sponsor add column if not exists hole_number      int;        -- set only when it's a hole sponsor
alter table sponsor add column if not exists active           boolean not null default true;
alter table sponsor add column if not exists sort_order        int    not null default 0;

-- 3. Save function for the admin Sponsors page (insert when p_id null, else update)
create or replace function save_sponsor(
  p_id               uuid,
  p_name             text,
  p_tier             text,   -- 'eagle' | 'birdie' | 'par' | '' (none)
  p_sponsorship_type text,
  p_hole_number      int,
  p_amount           numeric,
  p_active           boolean
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if p_id is null then
    insert into sponsor (event_id, name, tier, sponsorship_type, hole_number, amount, active)
    values (
      'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      p_name, nullif(p_tier, '')::sponsor_tier, p_sponsorship_type, p_hole_number,
      coalesce(p_amount, 0), p_active
    )
    returning id into v_id;
    return v_id;
  else
    update sponsor
      set name = p_name, tier = nullif(p_tier, '')::sponsor_tier,
          sponsorship_type = p_sponsorship_type, hole_number = p_hole_number,
          amount = coalesce(p_amount, 0), active = p_active
      where id = p_id;
    return p_id;
  end if;
end;
$$;

grant execute on function save_sponsor(uuid, text, text, text, int, numeric, boolean) to anon, authenticated;
