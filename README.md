# Drive Out Hunger Golf Outing — App Design Brief

> Self-contained brief for a design session with no prior context. Design the UI for the screens below.

## 1. What you're designing
A **mobile-first web app** for a charity golf outing — the **Drive Out Hunger Golf Outing**, August 30, 2026, run by the Greater Cincinnati Penn State Alumni Association (a 501(c)(3)). The event benefits **Last Mile Food Rescue**, a hunger-relief charity. Format: a 2-person scramble, ~72 golfers at Beckett Ridge Golf Club.

One product, three surfaces:
1. **Public registration page** — golfers sign up and pay; also shows sponsors. Web + mobile.
2. **Day-of player app** — what golfers use on event day: scorecard, live leaderboard, what they owe. **100% mobile.**
3. **Admin dashboard** — the organizer's private control panel. Responsive; desktop-first, but check-in is used on a phone.

## 2. Who uses it
- **Golfers** — adults, mixed ages and tech comfort. Day-of, they use it outdoors in bright sun, often one-handed, on a course with patchy cell signal.
- **Eddie (admin)** — chapter president, sole organizer. Power user; wants density and control.

## 3. Brand — Penn State
A Penn State alumni event — follow Penn State brand standards.
- **Colors:** Nittany Navy `#001E44` · Beaver Blue `#1E407C` · White `#FFFFFF` · Pugh Blue `#96BEE6` (light accent). Navy/Beaver Blue are the backbone; Pugh Blue for highlights; generous white space.
- **Type:** Roboto family — Roboto Slab for display/headlines, Roboto for everything else.
- **Logos:** use the official PSU Cincinnati chapter marks (circle or ribbon) — provided separately. Never draw or substitute a logo.
- **Tone:** collegiate and spirited (Penn State pride, but clean and modern) · warm and charitable (the cause stays visible) · sporty and functional day-of (the player app should feel like a sharp sports/scoring app — high-contrast, glanceable, big numbers) · trustworthy (people pay $100+).

## 4. Design principles
- **Mobile-first.** Design the player app at 390×844 (iPhone) first. Registration + admin are responsive.
- **Big tap targets, high contrast** — outdoor sun use; 48px minimum touch targets, large score inputs.
- **Glanceable** — leaderboard, score, money owed readable in 2 seconds.
- **Installable PWA** — the player app should feel like an app, not a webpage.
- **Tolerates bad signal** — clear offline/syncing states.
- **Accessible** — legible type, strong contrast, never color-only signals.

## 5. Screens to design

### Surface 1 — Public registration page (web + mobile)
1. Landing/hero — event name, date, course, "Benefits Last Mile Food Rescue," PSU Cincy logo, "Register your team" CTA.
2. Event details — schedule note (registration time, shotgun start, lunch, dinner & awards), what's included, location.
3. Sponsor & donor showcase — sponsor logos grouped by tier; donor list. Must look good with 3 sponsors or 30.
4. Registration form — team name; two golfers (name, email, phone, shirt size, dietary notes); optional add-on checkboxes; optional extra donation; running total; "Pay" button (payment via Zeffy — design the button + a short "you'll be taken to Zeffy" note).
5. Confirmation / thank-you — success message, team PIN shown, day-of app link.
6. "Become a sponsor" CTA section.

### Surface 2 — Day-of player app (mobile only)
1. Entry — pick your team from a list + enter 4-digit team PIN.
2. Home / My Team — your team + 2-person partner; your foursome (the 4 you play with); **your starting hole** shown big (shotgun start); today's schedule; announcement banner.
3. Scorecard — 18 holes; each shows par + a big team-score input (one score per hole — it's a scramble); running total and score-to-par.
4. Leaderboard — all 36 teams ranked by total strokes; your team highlighted; show holes played ("thru 7"); live.
5. Mulligan tracker — per hole, add/remove (max 2 per hole); running count + dollars owed ($2 each).
6. Add-ons / "What I owe" — paid/unpaid status for gimme rope, closest-to-pin & long drive, advantage cards, raffle; clear total owed.
7. Sponsors — logo list.

### Surface 3 — Admin dashboard (responsive; check-in is mobile)
1. Login.
2. Overview / money dashboard — headline **"Net to Last Mile Food Rescue"** (big number); plus gross raised, expenses, registration count, paid vs unpaid.
3. Sponsors manager — list + add/edit (name, tier, amount, logo upload, assign to a hole).
4. Donors manager — list + add/edit (name, donated item, value).
5. Registrations / teams — table of all teams, payment status, contacts.
6. Team & foursome builder — form/adjust 2-person teams, pair into 18 foursomes, assign starting holes. A visual drag-style layout fits well.
7. Catalog manager — purchasable items + prices; add new items anytime.
8. Check-in mode (mobile) — at the registration table: find a team, mark arrived, record purchases + payment method.
9. Course setup — 18 holes with pars (Beckett Ridge, par 72); flag which holes host closest-to-pin / long drive.
10. Announcements — post a banner message that appears in the player app.

## 6. Component inventory
Buttons (primary / secondary / large day-of) · cards (event, sponsor logo, team) · **leaderboard row** (rank, team, score-to-par, thru-X; "your team" highlight) · **scorecard hole tile** (hole #, par, score stepper) · **stat tile** (label + big number) · form fields (text, select, checkbox, stepper) · paid/unpaid badge · announcement banner · player-app bottom nav (Home · Scorecard · Leaderboard · Owe) · empty / loading / offline-syncing states.

## 7. Key states
Empty (no teams/sponsors, pre-score leaderboard) · offline/syncing ("saved, will sync") · paid vs unpaid · registration success.

## 8. Logos
The official PSU Cincinnati chapter logos are provided separately by Eddie (uploaded into the design session, or added to this repo) — a **circle** mark and a **ribbon** mark, each with light/dark color variants. Use the white version on dark navy backgrounds, the navy version on light backgrounds. Do not invent, redraw, or substitute a logo; use a clearly-labeled placeholder box if a logo isn't available yet.

## 9. Deliverable
Mockups of the screens in §5 — player-app mobile frames first, then the registration page, then admin. A **clickable HTML prototype** is ideal so Eddie can react to a visual direction. **Design only** — no backend, data, or payment logic.

## 10. Not in scope for design
Backend, database, payment integration, and auth implementation are handled in the build, not this design pass. Focus on layout, visual design, and flow.

---

*This README serves as the design brief while the app is in the design phase. The functional source of truth is `PRD.md`. Once the build begins, this README will be replaced with developer setup docs.*
