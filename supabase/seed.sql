-- ============================================================
-- Drive Out Hunger Golf Outing 2026 — Seed Data
-- Run this AFTER schema.sql
-- Populates event, holes, groups, sponsors, donors, catalog,
-- teams, players, scores, mulligans, and announcement.
-- ============================================================

do $$
declare
  v_event_id  uuid := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

  -- Group IDs (foursomes)
  v_g1 uuid := 'b1000000-0000-0000-0000-000000000001';
  v_g2 uuid := 'b1000000-0000-0000-0000-000000000002';
  v_g3 uuid := 'b1000000-0000-0000-0000-000000000003';
  v_g4 uuid := 'b1000000-0000-0000-0000-000000000004';
  v_g5 uuid := 'b1000000-0000-0000-0000-000000000005';
  v_g6 uuid := 'b1000000-0000-0000-0000-000000000006';
  v_g7 uuid := 'b1000000-0000-0000-0000-000000000007';

  -- Team IDs (matching ADMIN_TEAMS / PLAYER_TEAMS mock data)
  v_t01 uuid := 'c1000000-0000-0000-0000-000000000001'; -- Roar Lions Roar
  v_t02 uuid := 'c1000000-0000-0000-0000-000000000002'; -- Beaver Stadium Boys
  v_t03 uuid := 'c1000000-0000-0000-0000-000000000003'; -- Joe Pa Putters
  v_t07 uuid := 'c1000000-0000-0000-0000-000000000007'; -- Nittany Drivers (Eddie's team)
  v_t08 uuid := 'c1000000-0000-0000-0000-000000000008'; -- Lions of Cincy
  v_t09 uuid := 'c1000000-0000-0000-0000-000000000009'; -- Cincy Slicers
  v_t10 uuid := 'c1000000-0000-0000-0000-000000000010'; -- Penn State Putt-Heads
  v_t11 uuid := 'c1000000-0000-0000-0000-000000000011'; -- Greens & Garnet

begin

-- ─── Event ───────────────────────────────────────────────────
insert into event (
  id, name, date, course, format, hole_count,
  registration_fee, greens_fee_cost, shotgun_time, schedule
) values (
  v_event_id,
  'Drive Out Hunger Golf Outing',
  '2026-08-30',
  'Beckett Ridge Golf Club',
  '2-person scramble · 18 holes · shotgun start',
  18,
  100,
  75,
  '09:00',
  '[
    {"time": "8:00 AM",  "label": "Check-in opens · breakfast"},
    {"time": "8:45 AM",  "label": "Pre-round briefing"},
    {"time": "9:00 AM",  "label": "Shotgun start"},
    {"time": "12:30 PM", "label": "Lunch on the course"},
    {"time": "3:30 PM",  "label": "Dinner & awards"}
  ]'::jsonb
);


-- ─── Holes — Beckett Ridge pars (par 72) ─────────────────────
-- Pars:  H1=5  H2=4  H3=4  H4=3  H5=5  H6=3  H7=4  H8=4  H9=4
--       H10=3 H11=4 H12=5 H13=3 H14=5 H15=4 H16=3 H17=5 H18=4
-- Contests: CTP on holes 3 & 12 · Long drive on holes 6 & 16
insert into hole (event_id, number, par, contest_type) values
  (v_event_id,  1, 5, 'none'),
  (v_event_id,  2, 4, 'none'),
  (v_event_id,  3, 4, 'closest_to_pin'),
  (v_event_id,  4, 3, 'none'),
  (v_event_id,  5, 5, 'none'),
  (v_event_id,  6, 3, 'long_drive'),
  (v_event_id,  7, 4, 'none'),
  (v_event_id,  8, 4, 'none'),
  (v_event_id,  9, 4, 'none'),
  (v_event_id, 10, 3, 'none'),
  (v_event_id, 11, 4, 'none'),
  (v_event_id, 12, 5, 'closest_to_pin'),
  (v_event_id, 13, 3, 'none'),
  (v_event_id, 14, 5, 'none'),
  (v_event_id, 15, 4, 'none'),
  (v_event_id, 16, 3, 'long_drive'),
  (v_event_id, 17, 5, 'none'),
  (v_event_id, 18, 4, 'none');


-- ─── Groups (foursomes / shotgun assignments) ─────────────────
insert into "group" (id, event_id, number, starting_hole) values
  (v_g1, v_event_id, 1,  1),
  (v_g2, v_event_id, 2,  3),
  (v_g3, v_event_id, 3,  5),
  (v_g4, v_event_id, 4,  7),
  (v_g5, v_event_id, 5,  9),
  (v_g6, v_event_id, 6, 11),
  (v_g7, v_event_id, 7, 13);


-- ─── Sponsors ────────────────────────────────────────────────
-- Replace placeholder names with real sponsor names before event day.
insert into sponsor (event_id, name, tier, amount) values
  (v_event_id, 'Sponsor A', 'eagle',  2500),
  (v_event_id, 'Sponsor B', 'eagle',  2500),
  (v_event_id, 'Sponsor C', 'birdie', 1000),
  (v_event_id, 'Sponsor D', 'birdie', 1000),
  (v_event_id, 'Sponsor E', 'birdie', 1000),
  (v_event_id, 'Sponsor F', 'par',     500),
  (v_event_id, 'Sponsor G', 'par',     500),
  (v_event_id, 'Sponsor H', 'par',     500),
  (v_event_id, 'Sponsor I', 'par',     500),
  (v_event_id, 'Sponsor J', 'par',     500),
  (v_event_id, 'Sponsor K', 'par',     500);


-- ─── Donors ──────────────────────────────────────────────────
insert into donor (event_id, name, donated_item, estimated_value, use) values
  (v_event_id, 'Acme Family',        'Cabin weekend, Hocking Hills',    800, 'raffle'),
  (v_event_id, 'Bechtel Group',      'Wine pairing dinner for 6',        600, 'raffle'),
  (v_event_id, 'Cincinnati Cellars', 'Mixed case of Ohio wines',         250, 'raffle'),
  (v_event_id, 'Dunn Logistics',     'Tailgate package',                 400, 'raffle'),
  (v_event_id, 'Elliott & Co.',      'Tax-prep certificate',             350, 'raffle'),
  (v_event_id, 'Fields Auto',        'Detailing for two cars',           300, 'raffle'),
  (v_event_id, 'Garrett Estates',    'Charcuterie board, hand-crafted',  180, 'raffle'),
  (v_event_id, 'Hopper Brewing',     'Brewery tour for 12',              220, 'raffle'),
  (v_event_id, 'Indigo Print Co.',   'Custom letterpress notecards',     140, 'raffle'),
  (v_event_id, 'Jensen Roofing',     'Gutter cleaning + inspection',     320, 'raffle'),
  (v_event_id, 'Kepler Marketing',   'Brand strategy session (2 hrs)',   400, 'raffle'),
  (v_event_id, 'Lamar Films',        'Family portrait session',          350, 'raffle');


-- ─── Catalog items ───────────────────────────────────────────
insert into catalog_item (event_id, name, price, unit, channels, active, description) values
  (v_event_id, 'Team registration',              100, 'each', '{signup}',                    true,  '$100/golfer · 2-person team'),
  (v_event_id, 'Mulligan',                         2, 'each', '{check_in,during_round}',     true,  'Max 2 per hole · $2 each'),
  (v_event_id, 'Gimme rope (3 ft)',               10, 'each', '{signup,check_in}',            true,  'Use anywhere on the course'),
  (v_event_id, 'Closest-to-pin entry',            10, 'each', '{signup,check_in}',            true,  'Per person'),
  (v_event_id, 'Long-drive entry',                10, 'each', '{signup,check_in}',            true,  'Per person'),
  (v_event_id, 'Advantage card: opponent''s drive', 10, 'each', '{signup,check_in}',         true,  'One-time advantage card'),
  (v_event_id, 'Advantage card: front tees',      10, 'each', '{signup,check_in}',            true,  'One-time advantage card'),
  (v_event_id, 'Raffle ticket',                    5, 'each', '{check_in,during_round}',     true,  'Per ticket');


-- ─── Teams (from ADMIN_TEAMS + additional leaderboard teams) ─
insert into team (id, event_id, name, pin, group_id, payment_status, checked_in, single_golfer)
values
  (v_t01, v_event_id, 'Roar Lions Roar',       '1111', v_g1, 'paid',   true,  false),
  (v_t02, v_event_id, 'Beaver Stadium Boys',   '2222', v_g2, 'paid',   true,  false),
  (v_t03, v_event_id, 'Joe Pa Putters',        '3333', v_g3, 'paid',   true,  false),
  (v_t07, v_event_id, 'Nittany Drivers',       '4821', v_g4, 'unpaid', true,  false),
  (v_t08, v_event_id, 'Lions of Cincy',        '5555', v_g4, 'paid',   true,  false),
  (v_t09, v_event_id, 'Cincy Slicers',         '6666', v_g5, 'unpaid', false, false),
  (v_t10, v_event_id, 'Penn State Putt-Heads', '7777', v_g6, 'paid',   true,  false),
  (v_t11, v_event_id, 'Greens & Garnet',       '8888', v_g6, 'paid',   true,  false);


-- ─── Players ─────────────────────────────────────────────────
insert into player (team_id, name, email, arrived) values
  -- Roar Lions Roar (t01)
  (v_t01, 'M. Cole',   'mcole@example.com',    true),
  (v_t01, 'J. Pearce', 'jpearce@example.com',  true),
  -- Beaver Stadium Boys (t02)
  (v_t02, 'A. Webb',   'awebb@example.com',    true),
  (v_t02, 'R. Howe',   'rhowe@example.com',    true),
  -- Joe Pa Putters (t03)
  (v_t03, 'L. Kim',    'lkim@example.com',     true),
  (v_t03, 'T. Brown',  'tbrown@example.com',   true),
  -- Nittany Drivers (t07) — Eddie's team
  (v_t07, 'Jamie Miller', 'jmiller@psu.edu',       true),
  (v_t07, 'Eddie Gady',   'egady513@gmail.com',    true),
  -- Lions of Cincy (t08)
  (v_t08, 'D. Park',   'dpark@example.com',    true),
  (v_t08, 'M. Sato',   'msato@example.com',    true),
  -- Cincy Slicers (t09)
  (v_t09, 'F. Ortiz',  'fortiz@example.com',   false),
  (v_t09, 'N. Aziz',   'naziz@example.com',    false),
  -- Penn State Putt-Heads (t10)
  (v_t10, 'R. Tan',    'rtan@example.com',     true),
  (v_t10, 'M. Khan',   'mkhan@example.com',    true),
  -- Greens & Garnet (t11)
  (v_t11, 'E. Quinn',  'equinn@example.com',   true),
  (v_t11, 'L. Adler',  'ladler@example.com',   true);


-- ─── Scores — Nittany Drivers (Eddie's team, holes 7–15) ─────
-- Pars for holes 7-15: 4,4,4,3,4,5,3,5,4 = 36 total par
-- Scores: 4,3,5,4,6,2,4,4,5 = 37 total (+1 to par)
insert into score (team_id, hole_number, strokes) values
  (v_t07,  7, 4),
  (v_t07,  8, 3),
  (v_t07,  9, 5),
  (v_t07, 10, 4),
  (v_t07, 11, 6),
  (v_t07, 12, 2),
  (v_t07, 13, 4),
  (v_t07, 14, 4),
  (v_t07, 15, 5);

-- Roar Lions Roar — all 18, -6 to par (per leaderboard)
insert into score (team_id, hole_number, strokes) values
  (v_t01,  1, 4), (v_t01,  2, 3), (v_t01,  3, 3),
  (v_t01,  4, 2), (v_t01,  5, 4), (v_t01,  6, 2),
  (v_t01,  7, 3), (v_t01,  8, 3), (v_t01,  9, 4),
  (v_t01, 10, 2), (v_t01, 11, 3), (v_t01, 12, 4),
  (v_t01, 13, 2), (v_t01, 14, 4), (v_t01, 15, 3),
  (v_t01, 16, 2), (v_t01, 17, 4), (v_t01, 18, 4);

-- Beaver Stadium Boys — all 18, -4 to par
insert into score (team_id, hole_number, strokes) values
  (v_t02,  1, 4), (v_t02,  2, 4), (v_t02,  3, 3),
  (v_t02,  4, 2), (v_t02,  5, 5), (v_t02,  6, 3),
  (v_t02,  7, 4), (v_t02,  8, 3), (v_t02,  9, 3),
  (v_t02, 10, 2), (v_t02, 11, 4), (v_t02, 12, 4),
  (v_t02, 13, 3), (v_t02, 14, 5), (v_t02, 15, 4),
  (v_t02, 16, 3), (v_t02, 17, 5), (v_t02, 18, 4);


-- ─── Mulligans — Nittany Drivers ─────────────────────────────
-- MY_TEAM.mulligans: {7:1, 8:0, 9:2, 10:0, 11:1, 12:0, 13:0}
-- Only insert rows with count > 0 (zeros are the absence of a row)
insert into mulligan (team_id, hole_number, count) values
  (v_t07,  7, 1),
  (v_t07,  9, 2),
  (v_t07, 11, 1);


-- ─── Announcement ────────────────────────────────────────────
insert into announcement (event_id, message, pinned, posted_at) values
  (v_event_id,
   'Lunch is at the turn — pick it up at hole 10.',
   true,
   '2026-08-30 08:42:00-04');

end $$;
