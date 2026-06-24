-- ============================================================
-- "What's included" = single source of truth — run in SQL Editor
-- Stores the included list on the event; admin edits it, the public
-- registration page reads it.
-- ============================================================

alter table event add column if not exists included jsonb;

-- Seed with the current list (edit it in admin afterward)
update event
set included = '[
  "Greens fee and cart for both golfers",
  "Range balls + practice green",
  "Breakfast at check-in",
  "Lunch & awards reception",
  "Tournament gift bag",
  "Live mobile scoring app"
]'::jsonb
where id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' and included is null;

create or replace function set_event_included(new_included jsonb)
returns void
language sql
security definer
set search_path = public
as $$
  update event set included = new_included
  where id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
$$;

grant execute on function set_event_included(jsonb) to anon, authenticated;
