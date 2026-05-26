-- ============================================================
-- Add chat messages + is_admin flag — run in Supabase SQL Editor
-- Safe to run on a live DB (uses IF NOT EXISTS guards).
-- After running, go to Database → Replication and toggle
-- the "messages" table ON for Realtime.
-- ============================================================

-- 1. Admin flag on team
alter table team
  add column if not exists is_admin boolean not null default false;

-- 2. Messages table
create table if not exists messages (
  id          uuid        primary key default gen_random_uuid(),
  event_id    uuid        not null references event(id) on delete cascade,
  team_id     uuid        references team(id) on delete set null,
  sender_name text        not null,
  role        text        not null default 'player' check (role in ('player', 'admin')),
  body        text        not null,
  is_pinned   boolean     not null default false,
  created_at  timestamptz not null default now()
);

-- 3. Index for ordered fetch
create index if not exists idx_messages_event
  on messages (event_id, created_at asc);

-- 4. RLS
alter table messages enable row level security;

-- Anyone (anon) can read
create policy "public read messages"
  on messages for select to anon, authenticated
  using (true);

-- Anon (players) can insert
create policy "anon insert messages"
  on messages for insert to anon
  with check (true);

-- Authenticated (admin) full access
create policy "admin all messages"
  on messages for all to authenticated
  using (true) with check (true);

-- 5. Mark Eddie's team as admin (run after you know the team_id)
--    Replace the UUID below with Eddie's actual team_id from the team table.
--    SELECT id, name FROM team WHERE event_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
-- update team set is_admin = true where id = '<eddies-team-id>';
