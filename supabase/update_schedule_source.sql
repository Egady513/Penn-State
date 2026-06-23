-- ============================================================
-- Schedule = single source of truth — run in Supabase SQL Editor
-- The event.schedule JSONB is now the ONE place the agenda lives.
-- Admin edits it; the public site + player app read it.
-- ============================================================

-- 1. Corrected schedule: 8:00 shotgun → ~1:00 lunch & awards (not dinner).
--    Starter data — fine-tune it in the admin Schedule page.
update event
set schedule = '[
  {"time": "7:15 AM", "label": "Check-in & breakfast"},
  {"time": "7:45 AM", "label": "Pre-round briefing"},
  {"time": "8:00 AM", "label": "Shotgun start"},
  {"time": "1:00 PM", "label": "Lunch & awards"}
]'::jsonb
where id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

-- 2. Save function so the admin Schedule page can persist without a login.
--    Security definer = runs with owner rights, so the anon (admin, for now)
--    role can update the schedule. Tighten to authenticated when real login lands.
create or replace function set_event_schedule(new_schedule jsonb)
returns void
language sql
security definer
set search_path = public
as $$
  update event
  set schedule = new_schedule
  where id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
$$;

grant execute on function set_event_schedule(jsonb) to anon, authenticated;
