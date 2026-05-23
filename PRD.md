# Drive Out Hunger Golf Outing — App PRD

| | |
|---|---|
| **Project** | Golf outing management + day-of player app |
| **Org** | Greater Cincinnati Penn State Alumni Association — 501(c)(3), EIN 31-1100175 |
| **Benefits** | Last Mile Food Rescue |
| **Event date** | Sunday, August 30, 2026 |
| **Course** | Beckett Ridge Golf Club, West Chester, OH — 18 holes, par 72 |
| **Format** | 2-person scramble |
| **Target** | 72 players · 36 teams · 18 foursomes |
| **Owner** | Eddie Gady |
| **Status** | Draft v0.3 — 2026-05-22 |
| **Stack** | Next.js + Supabase, deployed on Vercel (free tier) |

---

## 1. Goal

One app that does two jobs:

1. **Run the outing** — track sponsors, donors, registrations, every purchase, and the live total raised; publish a public registration page.
2. **Day-of player experience** — give golfers a mobile app for their scorecard, a live leaderboard, and what they owe.

It replaces manual spreadsheets, maximizes net dollars to Last Mile Food Rescue, and gives Eddie a single live "how are we doing" number from the day registration opens through the last putt on 8/30.

---

## 2. Architecture — one app, one database, three surfaces

A **single app on a single Supabase database**, not separate backend/frontend apps. Registration, planning, and day-of all read and write the same records — a golfer who registers online must appear in the foursome builder and then in their day-of app with the correct paid status. Separate apps would mean separate databases and constant syncing, which breaks the one-source-of-truth rule.

| Surface | Who | Purpose |
|---|---|---|
| **Public registration page** | Golfers, public | Event info, sponsor/donor logos, registration form, payment |
| **Admin dashboard** | Eddie (admin only) | Sponsors, donors, registrations, team/foursome builder, money tracker, day-of check-in |
| **Day-of player app** (PWA) | Registered golfers | Foursome, scorecard, live leaderboard, mulligan + purchase tracking |

---

## 3. Users & roles

Two roles only.

- **Admin (Eddie)** — sees and controls everything: sponsors, donors, registrations, the team/foursome builder, hole assignments, money tracker, catalog, and day-of check-in. Supabase Auth email login. This is Eddie's private planning view.
- **Player** — registered golfers. Pre-tournament they see the registration page; on event day they see the day-of app (scorecard, leaderboard, add-ons, their foursome). Players enter the day-of app by picking their team and entering a 4-digit **team PIN** issued at registration.

The public registration page and the live leaderboard are open to anyone with the link (no login). Everything else is admin-only.

---

## 4. Money model — how "raised" is calculated

Eddie needs **one live figure he trusts**, from registration open through the event, including purchases invented on the day.

```
Gross raised   = registration fees + sponsorships + all purchases (add-ons + raffle) + extra donations
Expenses       = greens fees (players × $75, owed to the course) + other event expenses
NET to charity = Gross raised − Expenses        ← the headline number
```

- **Registration fee:** $100 / player. Of that, **$75 / player is the greens fee** owed to Beckett Ridge — modeled as an automatic expense line, so net registration revenue is ~$25 / player.
- **Flexible purchase catalog (key requirement):** purchases are **not** hardcoded. Admin manages a *catalog* of items (price, where it can be sold, active/inactive) and can **add a new item at any time** — including on event day. Every sale references a catalog item, so a purchase type invented at 10am on 8/30 still flows into the live total.
- The money dashboard shows gross, expenses, and net — always current.

---

## 5. Data model (Supabase / Postgres)

- **event** — name, date, course, format, hole count, `registration_fee` (100), `greens_fee_cost` (75), shotgun time, schedule.
- **hole** — number (1–18), par, `contest_type` (none / closest_to_pin / long_drive / hole_in_one), hole_sponsor_id.
- **group** (foursome) — number (1–18), `starting_hole` (shotgun start).
- **team** — name, 4-digit PIN, group_id, registration_id, payment_status, checked_in.
- **player** — name, email, phone, shirt size, dietary notes, team_id.
- **registration** — team_id, fee_amount, payment_method, payment_status, registered_at.
- **sponsor** — name, tier, cash amount, logo_url, website, hole_id (if a hole sponsor).
- **donor** — name, donated item, estimated value, logo_url, use (raffle / prize).
- **catalog_item** — name, price, unit (each / bundle), `channels` (signup / check-in / during round), active. *The flexible purchase list — seeded with the items below, editable anytime.*
- **purchase** — catalog_item_id, team_id or player_id, quantity, amount, paid_status, payment_method, channel, created_at.
- **mulligan** — team_id, hole_number, count (0–2, capped). $ owed = total count × $2.
- **score** — team_id, hole_number, strokes.
- **contest_result** — hole_id, contest_type, winning team/player (recorded day-of).
- **expense** — description, amount, category (greens fees auto-calculated; others manual).
- **announcement** — message, posted_at (drives the day-of in-app banner).

**Seeded catalog items:**

| Item | Price | Sold where |
|---|---|---|
| Gimme rope (3-ft) | $10 | Signup or check-in |
| Mulligan | $2 each | During the round (max 2/team/hole) |
| Closest-to-pin + long drive | $20 | Signup or check-in |
| Advantage card — "Share my opponent's drive" | $10 | Signup or check-in |
| Advantage card — "Play from the front tees" | $10 | Signup or check-in |
| Raffle tickets | $5 / 1 · $15 / 5 · $20 / 10 | Signup, check-in, day-of |

---

## 6. Surface 1 — Public registration page

- Event header — name, date (8/30/2026), course, the cause (Last Mile Food Rescue), 501(c)(3) tax-deductible note.
- **Day-of schedule / agenda note** — registration time, shotgun start, lunch, dinner & awards. Informational text only — no agenda feature to build.
- **Sponsor + donor showcase** — all sponsors and donors with logos, grouped by tier. Driven by the admin sponsor/donor manager, so it updates the moment Eddie adds a new one. Can stand alone as its own `/sponsors` page (Backlogged).
- **Registration form (native, writes straight to Supabase):**
  - Team name + both players' info (name, email, phone, shirt size, dietary notes).
  - Optional add-ons at signup (from the catalog).
  - Optional extra donation.
  - $100/player fee → payment via **Zeffy** (see §10).
- "Become a sponsor" call-to-action → contact form or Eddie's email.
- On submit: creates `team` + `player` + `registration` records and generates the team PIN.
- *Post-payment confirmation email (PIN + app link) is a fast-follow after the core app works — Backlogged.*

---

## 7. Surface 2 — Admin dashboard

*Eddie's private, login-protected view — players never see this.*

- **Money dashboard** — live gross raised, expenses (greens fees auto + manual), and the headline **"Net to Last Mile Food Rescue."**
- **Catalog manager** — add/edit purchasable items and prices anytime, including on event day.
- **Sponsors** — add/edit, tier, cash amount, logo upload (Supabase Storage), assign to a hole.
- **Donors** — add/edit, donated items, estimated value, logo.
- **Registrations / teams** — list all teams, payment status, contact info.
- **Team & foursome builder** — form or adjust the 2-person teams, pair them into 18 foursomes, and assign each foursome a **shotgun starting hole**.
- **Check-in mode** — mark teams arrived; record on-the-spot purchases with payment method.
- **Purchase & payment tracking** — every sale, channel, paid/unpaid, method.
- **Course setup** — Beckett Ridge holes/pars pre-loaded (Appendix A); flag contest holes.
- **Announcements** — post day-of messages that appear as a banner in the player app.
- **Export** — registrations / financials for chapter records and the charity.

---

## 8. Surface 3 — Day-of player app (mobile PWA)

Installable on iPhone and Android, also works as a website. Built to tolerate spotty cell coverage (enter scores offline, sync when signal returns).

- **My team** — partner, your foursome (who you're playing with), and **your starting hole**.
- **Scorecard** — one team score per hole (2-person scramble), running total vs par.
- **Live leaderboard** — all 36 teams ranked, updates in real time (Supabase Realtime).
- **Mulligan tracker** — tap to add a mulligan; **max 2 per hole**; shows count and running $ owed.
- **Purchase status** — gimme rope, closest-to-pin/long-drive paid/unpaid (to show the volunteer at the hole), advantage cards, raffle tickets.
- **Sponsors & donors** — logo section.
- **Schedule + announcements** — day agenda and the live banner.

---

## 9. Scoring logic — 2-person scramble

- Both players hit; the team plays the better shot, repeats, records **one team score per hole**.
- Leaderboard ranks **teams** by total strokes (gross). No handicap.
- A "foursome" = the playing **group** of 4 (two 2-person teams) — 18 foursomes total.
- **Shotgun start:** every foursome begins on a different hole; admin assigns the starting hole, the player app displays it.
- Beckett Ridge pars pre-loaded (Appendix A). Tiebreakers configurable; flights optional.

---

## 10. Payments

- **Online registration → Zeffy.** $0 platform and $0 processing fees; built for 501(c)(3)s, which the chapter is. An optional voluntary tip from the payer funds Zeffy; the chapter keeps 100%.
- **Venmo** — supported as a manual method (player Venmos the chapter, admin marks paid). No automatic reconciliation.
- **Day-of purchases** — cash + Venmo, optionally Square Tap-to-Pay so an organizer can take a card on a phone. The app tracks amount owed; the organizer records the method.
- Because purchases run through the flexible catalog (§4), money raised stays current no matter how payment came in.

---

## 11. Brand — Penn State

The app and all event materials follow Penn State brand standards.

- **Colors:** Nittany Navy `#001E44` · Beaver Blue `#1E407C` · White `#FFFFFF` · Pugh Blue `#96BEE6` (secondary accent).
- **Web font:** Roboto (Roboto / Roboto Slab / Roboto Condensed).
- **Reference:** https://brand.psu.edu/design-toolkit/design-essentials
- **Logos:** always use the PSU Cincy chapter marks from `Penn State/Logos/` — circle or ribbon, with color variants inside the `.zip` files. Do not recreate or substitute the logo.

---

## 12. Tech stack

- **Frontend/app** — Next.js (App Router), deployed on Vercel free tier.
- **Database/backend** — Supabase: Postgres, Auth (admin), Storage (sponsor logos), Realtime (live leaderboard).
- **Day-of app** — PWA (installable, offline-tolerant score entry).
- **Payments** — Zeffy (online), Venmo (manual), Square Tap-to-Pay optional (day-of).
- **Admin auth** — Supabase Auth email login. **Player access** — team PIN, no account.

---

## 13. Build phases & timeline

Event is **8/30/2026** — roughly 14 weeks out as of this draft.

**Phase 1 — Planning & registration** *(target live ~late June)*
Data model, admin dashboard (sponsors, donors, teams, catalog, money tracker), public registration page, Zeffy payment, course setup. Registration needs the longest runway.

**Phase 2 — Day-of player app** *(July–August)*
Foursome view, scorecard, live leaderboard, mulligan tracker, purchase status.

**Phase 3 — Day-of operations & polish** *(ready ~2 weeks before)*
Check-in mode, announcements banner, offline resilience, exports, a full test run.

---

## 14. Open items

1. **Contest holes** — which holes host closest-to-pin / long drive (and a hole-in-one prize hole)? Beckett's par-3s are 4, 6, 10, 13, 16; par-5s are 1, 5, 12, 14, 17.
2. **Sponsor tiers** — confirm tier names + price points for the sponsor showcase grouping.

*Tracked in the vault Backlog:* tee selection, confirming which holes have sponsors, the standalone Sponsor page, and the post-payment confirmation email.

---

## Appendix A — Beckett Ridge Golf Club scorecard

18 holes · Par 72 · ~6,857 yards (black tees). Par is identical from every tee — only yardages differ; the event's tee selection is TBD (see Backlog).

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | **Out** | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | **In** | **Total** |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Par** | 5 | 4 | 4 | 3 | 5 | 3 | 4 | 4 | 4 | **36** | 3 | 4 | 5 | 3 | 5 | 4 | 3 | 5 | 4 | **36** | **72** |

Par-3s: 4, 6, 10, 13, 16 · Par-4s: 2, 3, 7, 8, 9, 11, 15, 18 · Par-5s: 1, 5, 12, 14, 17.
