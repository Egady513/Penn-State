-- Dummy hole sponsor assignments for testing
-- Run this once in the Supabase SQL Editor.
-- Event ID: a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11
--
-- Assigns sponsors to 6 holes so the "This hole brought to you by"
-- banner appears on the scorecard during testing.
--
--   Hole 1  (par 5)       ← Sponsor A (Eagle)
--   Hole 3  (par 4, CTP)  ← Sponsor C (Birdie)
--   Hole 6  (par 3, LD)   ← Sponsor B (Eagle)
--   Hole 9  (par 4)       ← Sponsor D (Birdie)
--   Hole 12 (par 5, CTP)  ← Sponsor E (Birdie)
--   Hole 16 (par 3, LD)   ← Sponsor F (Par)
-- ─────────────────────────────────────────────────────────────

do $$
declare
  v_event uuid := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

  -- hole IDs
  v_hole1  uuid; v_hole3  uuid; v_hole6  uuid;
  v_hole9  uuid; v_hole12 uuid; v_hole16 uuid;

  -- sponsor IDs
  v_sA uuid; v_sB uuid; v_sC uuid;
  v_sD uuid; v_sE uuid; v_sF uuid;
begin
  -- Look up hole IDs
  select id into v_hole1  from hole where event_id = v_event and number =  1;
  select id into v_hole3  from hole where event_id = v_event and number =  3;
  select id into v_hole6  from hole where event_id = v_event and number =  6;
  select id into v_hole9  from hole where event_id = v_event and number =  9;
  select id into v_hole12 from hole where event_id = v_event and number = 12;
  select id into v_hole16 from hole where event_id = v_event and number = 16;

  -- Look up sponsor IDs
  select id into v_sA from sponsor where event_id = v_event and name = 'Sponsor A';
  select id into v_sB from sponsor where event_id = v_event and name = 'Sponsor B';
  select id into v_sC from sponsor where event_id = v_event and name = 'Sponsor C';
  select id into v_sD from sponsor where event_id = v_event and name = 'Sponsor D';
  select id into v_sE from sponsor where event_id = v_event and name = 'Sponsor E';
  select id into v_sF from sponsor where event_id = v_event and name = 'Sponsor F';

  -- Assign sponsor → hole (sponsor.hole_id)
  update sponsor set hole_id = v_hole1  where id = v_sA;
  update sponsor set hole_id = v_hole3  where id = v_sC;
  update sponsor set hole_id = v_hole6  where id = v_sB;
  update sponsor set hole_id = v_hole9  where id = v_sD;
  update sponsor set hole_id = v_hole12 where id = v_sE;
  update sponsor set hole_id = v_hole16 where id = v_sF;

  -- Assign hole → sponsor (hole.hole_sponsor_id)
  update hole set hole_sponsor_id = v_sA where id = v_hole1;
  update hole set hole_sponsor_id = v_sC where id = v_hole3;
  update hole set hole_sponsor_id = v_sB where id = v_hole6;
  update hole set hole_sponsor_id = v_sD where id = v_hole9;
  update hole set hole_sponsor_id = v_sE where id = v_hole12;
  update hole set hole_sponsor_id = v_sF where id = v_hole16;

  raise notice 'Done — 6 hole sponsors assigned.';
end $$;
