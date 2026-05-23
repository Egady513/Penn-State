-- ============================================================
-- Drive Out Hunger Golf Outing 2026 — Supabase Schema
-- Run this FIRST in Supabase SQL Editor (Database → SQL Editor)
-- Safe to re-run: drops all objects then recreates them.
-- ============================================================


-- ─── Enums ───────────────────────────────────────────────────
drop type if exists payment_method   cascade;
drop type if exists payment_status   cascade;
drop type if exists contest_type     cascade;
drop type if exists sponsor_tier     cascade;
drop type if exists purchase_channel cascade;
drop type if exists catalog_unit     cascade;
drop type if exists donor_use        cascade;
drop type if exists expense_category cascade;

create type payment_method   as enum ('zeffy','venmo','cash','square','other');
create type payment_status   as enum ('paid','unpaid','partial');
create type contest_type     as enum ('none','closest_to_pin','long_drive','hole_in_one');
create type sponsor_tier     as enum ('eagle','birdie','par');
create type purchase_channel as enum ('signup','check_in','during_round');
create type catalog_unit     as enum ('each','bundle');
create type donor_use        as enum ('raffle','prize');
create type expense_category as enum ('greens_fees','other');


-- ─── Drop existing tables (reverse FK order) ─────────────────
drop table if exists announcement  cascade;
drop table if exists expense       cascade;
drop table if exists score         cascade;
drop table if exists mulligan      cascade;
drop table if exists purchase      cascade;
drop table if exists catalog_item  cascade;
drop table if exists donor         cascade;
drop table if exists sponsor       cascade;
drop table if exists registration  cascade;
drop table if exists player        cascade;
drop table if exists team          cascade;
drop table if exists "group"       cascade;
drop table if exists hole          cascade;
drop table if exists event         cascade;


-- ─── Tables ──────────────────────────────────────────────────

create table event (
  id               uuid          primary key default gen_random_uuid(),
  name             text          not null,
  date             date          not null,
  course           text          not null,
  format           text          not null default '2-person scramble',
  hole_count       int           not null default 18,
  registration_fee numeric(10,2) not null default 100,
  greens_fee_cost  numeric(10,2) not null default 75,
  shotgun_time     time,
  schedule         jsonb,
  created_at       timestamptz   not null default now()
);

-- hole.hole_sponsor_id FK is added after the sponsor table
create table hole (
  id              uuid         primary key default gen_random_uuid(),
  event_id        uuid         not null references event(id) on delete cascade,
  number          int          not null check (number between 1 and 18),
  par             int          not null check (par between 3 and 5),
  contest_type    contest_type not null default 'none',
  hole_sponsor_id uuid,
  unique (event_id, number)
);

create table "group" (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references event(id) on delete cascade,
  number        int  not null,
  starting_hole int  not null check (starting_hole between 1 and 18),
  unique (event_id, number)
);

-- team.registration_id FK is added after the registration table (circular ref)
create table team (
  id              uuid           primary key default gen_random_uuid(),
  event_id        uuid           not null references event(id) on delete cascade,
  name            text           not null,
  pin             char(4)        not null,
  group_id        uuid           references "group"(id),
  registration_id uuid,
  payment_status  payment_status not null default 'unpaid',
  checked_in      boolean        not null default false,
  single_golfer   boolean        not null default false,
  created_at      timestamptz    not null default now(),
  unique (event_id, pin)
);

create table player (
  id            uuid    primary key default gen_random_uuid(),
  team_id       uuid    not null references team(id) on delete cascade,
  name          text    not null,
  email         text    not null,
  phone         text,
  shirt_size    text,
  dietary_notes text,
  arrived       boolean not null default false
);

create table registration (
  id             uuid           primary key default gen_random_uuid(),
  team_id        uuid           not null references team(id) on delete cascade,
  fee_amount     numeric(10,2)  not null,
  payment_method payment_method,
  payment_status payment_status not null default 'unpaid',
  registered_at  timestamptz    not null default now()
);

-- Resolve circular FK: team → registration
alter table team
  add constraint fk_team_registration
  foreign key (registration_id) references registration(id)
  deferrable initially deferred;

create table sponsor (
  id       uuid          primary key default gen_random_uuid(),
  event_id uuid          not null references event(id) on delete cascade,
  name     text          not null,
  tier     sponsor_tier  not null,
  amount   numeric(10,2) not null default 0,
  logo_url text,
  website  text,
  hole_id  uuid          references hole(id)
);

-- Resolve hole → sponsor FK
alter table hole
  add constraint fk_hole_sponsor
  foreign key (hole_sponsor_id) references sponsor(id);

create table donor (
  id              uuid          primary key default gen_random_uuid(),
  event_id        uuid          not null references event(id) on delete cascade,
  name            text          not null,
  donated_item    text          not null,
  estimated_value numeric(10,2) not null default 0,
  logo_url        text,
  use             donor_use     not null default 'raffle'
);

create table catalog_item (
  id          uuid               primary key default gen_random_uuid(),
  event_id    uuid               not null references event(id) on delete cascade,
  name        text               not null,
  price       numeric(10,2)      not null,
  unit        catalog_unit       not null default 'each',
  channels    purchase_channel[] not null default '{}',
  active      boolean            not null default true,
  description text
);

create table purchase (
  id              uuid             primary key default gen_random_uuid(),
  catalog_item_id uuid             not null references catalog_item(id),
  team_id         uuid             references team(id),
  player_id       uuid             references player(id),
  quantity        int              not null default 1 check (quantity > 0),
  amount          numeric(10,2)    not null,
  paid_status     payment_status   not null default 'unpaid',
  payment_method  payment_method,
  channel         purchase_channel not null default 'signup',
  created_at      timestamptz      not null default now()
);

create table mulligan (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references team(id) on delete cascade,
  hole_number int  not null check (hole_number between 1 and 18),
  count       int  not null default 0 check (count between 0 and 2),
  unique (team_id, hole_number)
);

create table score (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references team(id) on delete cascade,
  hole_number int  not null check (hole_number between 1 and 18),
  strokes     int  not null check (strokes between 1 and 12),
  unique (team_id, hole_number)
);

create table expense (
  id          uuid             primary key default gen_random_uuid(),
  event_id    uuid             not null references event(id) on delete cascade,
  description text             not null,
  amount      numeric(10,2)    not null,
  category    expense_category not null default 'other',
  created_at  timestamptz      not null default now()
);

create table announcement (
  id        uuid        primary key default gen_random_uuid(),
  event_id  uuid        not null references event(id) on delete cascade,
  message   text        not null,
  pinned    boolean     not null default false,
  posted_at timestamptz not null default now()
);


-- ─── Indexes ─────────────────────────────────────────────────
create index idx_hole_event     on hole(event_id);
create index idx_team_event     on team(event_id);
create index idx_team_pin       on team(event_id, pin);
create index idx_player_team    on player(team_id);
create index idx_score_team     on score(team_id);
create index idx_mulligan_team  on mulligan(team_id);
create index idx_sponsor_event  on sponsor(event_id, tier);
create index idx_purchase_team  on purchase(team_id);
create index idx_announcement   on announcement(event_id, pinned, posted_at desc);


-- ─── Row Level Security ───────────────────────────────────────
alter table event        enable row level security;
alter table hole         enable row level security;
alter table "group"      enable row level security;
alter table team         enable row level security;
alter table player       enable row level security;
alter table registration enable row level security;
alter table sponsor      enable row level security;
alter table donor        enable row level security;
alter table catalog_item enable row level security;
alter table purchase     enable row level security;
alter table mulligan     enable row level security;
alter table score        enable row level security;
alter table expense      enable row level security;
alter table announcement enable row level security;

-- Public read (anon + authenticated can read these)
create policy "public read event"        on event        for select to anon, authenticated using (true);
create policy "public read hole"         on hole         for select to anon, authenticated using (true);
create policy "public read group"        on "group"      for select to anon, authenticated using (true);
create policy "public read team"         on team         for select to anon, authenticated using (true);
create policy "public read player"       on player       for select to anon, authenticated using (true);
create policy "public read sponsor"      on sponsor      for select to anon, authenticated using (true);
create policy "public read donor"        on donor        for select to anon, authenticated using (true);
create policy "public read catalog"      on catalog_item for select to anon, authenticated using (true);
create policy "public read announcement" on announcement for select to anon, authenticated using (true);
create policy "public read score"        on score        for select to anon, authenticated using (true);
create policy "public read mulligan"     on mulligan     for select to anon, authenticated using (true);

-- Anon: public registration flow
create policy "anon insert team"         on team         for insert to anon with check (true);
create policy "anon insert player"       on player       for insert to anon with check (true);
create policy "anon insert registration" on registration for insert to anon with check (true);

-- Anon: in-round scoring (PIN-gated at app layer)
create policy "anon insert score"        on score     for insert to anon with check (true);
create policy "anon update score"        on score     for update to anon using (true) with check (true);
create policy "anon insert mulligan"     on mulligan  for insert to anon with check (true);
create policy "anon update mulligan"     on mulligan  for update to anon using (true) with check (true);

-- Anon: on-course purchases (at the tent)
create policy "anon insert purchase"     on purchase  for insert to anon with check (true);

-- Authenticated (admin): full access to all tables
create policy "admin all event"          on event        for all to authenticated using (true) with check (true);
create policy "admin all hole"           on hole         for all to authenticated using (true) with check (true);
create policy "admin all group"          on "group"      for all to authenticated using (true) with check (true);
create policy "admin all team"           on team         for all to authenticated using (true) with check (true);
create policy "admin all player"         on player       for all to authenticated using (true) with check (true);
create policy "admin all registration"   on registration for all to authenticated using (true) with check (true);
create policy "admin all sponsor"        on sponsor      for all to authenticated using (true) with check (true);
create policy "admin all donor"          on donor        for all to authenticated using (true) with check (true);
create policy "admin all catalog"        on catalog_item for all to authenticated using (true) with check (true);
create policy "admin all purchase"       on purchase     for all to authenticated using (true) with check (true);
create policy "admin all mulligan"       on mulligan     for all to authenticated using (true) with check (true);
create policy "admin all score"          on score        for all to authenticated using (true) with check (true);
create policy "admin all expense"        on expense      for all to authenticated using (true) with check (true);
create policy "admin all announcement"   on announcement for all to authenticated using (true) with check (true);
