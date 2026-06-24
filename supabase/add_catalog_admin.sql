-- ============================================================
-- Catalog = single source of truth — run in Supabase SQL Editor
-- Lets the admin Catalog page edit add-ons and have registration follow.
-- Safe to run on the live DB (IF NOT EXISTS guards).
-- ============================================================

-- 1. Fields the registration form + admin grouping need
alter table catalog_item add column if not exists per_person boolean not null default false;
alter table catalog_item add column if not exists sort_order int     not null default 0;
alter table catalog_item add column if not exists tag         text;   -- 'ctp' / 'ld' identify the contest items

-- 2. Tag the two contest items so the form can combine them into the challenge
update catalog_item set tag = 'ctp', per_person = true
  where event_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' and name ilike '%closest%';
update catalog_item set tag = 'ld', per_person = true
  where event_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' and name ilike '%long-drive%';

-- Tag the base registration fee so it does NOT appear as a registration add-on
update catalog_item set tag = 'base'
  where event_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' and name ilike 'Team registration%';

-- 3. Save function for the admin Catalog page (insert when p_id is null, else update).
--    Security definer so the admin page can write without a login (for now).
create or replace function save_catalog_item(
  p_id          uuid,
  p_name        text,
  p_price       numeric,
  p_description text,
  p_active      boolean,
  p_per_person  boolean
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if p_id is null then
    insert into catalog_item (event_id, name, price, description, active, per_person, channels, unit)
    values (
      'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      p_name, p_price, p_description, p_active, p_per_person,
      '{signup,check_in}'::purchase_channel[], 'each'
    )
    returning id into v_id;
    return v_id;
  else
    update catalog_item
      set name = p_name, price = p_price, description = p_description,
          active = p_active, per_person = p_per_person
      where id = p_id;
    return p_id;
  end if;
end;
$$;

grant execute on function save_catalog_item(uuid, text, numeric, text, boolean, boolean) to anon, authenticated;
