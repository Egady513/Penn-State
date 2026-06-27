# Drive Out Hunger Golf App — Pre-Launch Audit Report

**Date:** 2026-06-25 (compiled overnight)
**Prepared for:** Eddie Gady, President — Greater Cincinnati Penn State Alumni Association
**Method:** Three independent expert code-audit agents, one each for the **registration/payment flow**, the **admin app**, and the **play (day-of) app**. Read-only analysis of the full codebase + Supabase schema/migrations.
**Trigger:** Registration link is planned to go public this weekend.

---

## 1. Bottom line

> **Do not send the public registration link yet.** The form *looks* finished and the happy path mostly works, but the payment and security foundation has holes that will cost real money or lock real people out on day one. None are huge — they're a focused set of fixes, realistically a half-day of work plus a few Supabase steps we do together — but they must be done first.

**Three-sentence version:** (1) The amount charged in Stripe is whatever the browser says it is — it's never verified on the server, and the webhook marks teams "paid" without checking the amount or even that payment succeeded. (2) Registrations get written to the database *before* payment with a broken cleanup, so abandoned checkouts pile up ghost teams that block real registrants from reusing their own team name. (3) The admin area has no real login — anyone with the URL can read every registrant's name, email, phone, and PIN, and mark teams paid.

**What's NOT a problem:** The day-of "play" app is genuinely built on real data (the mock-data worry was unfounded) and it's **Phase 2 for August** — it is *not* on this weekend's critical path, so its issues have a two-month runway.

---

## 2. The launch decision

To safely send the registration link, these must be true:

- [ ] Stripe charges the **server-computed** total, not the browser's number.
- [ ] The webhook only marks a team paid after confirming Stripe actually collected the right amount.
- [ ] A registrant who abandons checkout can come back and finish — without being told their own team name is "taken."
- [ ] The confirmation screen never shows a real team's PIN to the wrong person.
- [ ] The admin area requires a real login (it holds everyone's personal info).
- [ ] No fake "Sponsor A/B/C" or placeholder donors appear on the public page.

Until those boxes are checked, every public registration is a potential lost payment, a support headache, or a privacy exposure.

---

## 3. 🔴 Launch blockers — full detail

Each item: **what happens → why it matters → the fix → who does it.**

### B1 — Stripe charges a client-supplied amount (payment integrity)
- **Where:** `app/components/RegisterSection.tsx:344` → `app/actions/checkout.ts:29`
- **What happens:** The browser calculates the order total and passes it straight to Stripe (`unit_amount: Math.round(args.amount * 100)`). The server never recomputes it.
- **Why it matters:** A technically-savvy person can open dev tools and pay **$1 for a $200 team**. The database still records the full purchases, and the webhook still marks them paid. This is the single most serious issue.
- **Fix:** In `checkout.ts`, recompute the authoritative total **server-side** from the `teamId` — sum `registration.fee_amount` + `registration.donation_amount` + the team's `purchase` rows (read with the service-role client in `lib/supabase/admin.ts`). Charge that. Never trust the amount from the browser.
- **Who:** Me (code).

### B2 — Webhook marks teams paid without verifying payment
- **Where:** `app/api/stripe/webhook/route.ts:31`
- **What happens:** On `checkout.session.completed` it flips team + registration + purchases to **paid** based only on `metadata.team_id` — it ignores `session.payment_status` and `session.amount_total`.
- **Why it matters:** Combined with B1, an underpaid (or otherwise incomplete) session still marks everything paid. Your money totals would be wrong and unrecoverable.
- **Fix:** Confirm `session.payment_status === 'paid'` **and** that `amount_total` matches the team's recomputed total before marking paid. Log/skip on mismatch instead of trusting it.
- **Who:** Me (code).

### B3 — Registrations are written before payment, and cleanup silently fails
- **Where:** `app/actions/register.ts:60-171` (writes), rollback at `:61,97,112,127,166`; cancel URL `app/actions/checkout.ts:27`
- **What happens:** The team, players, registration, and purchases are all written (as `unpaid`) **before** Stripe even opens. If the registration hits an error partway, the rollback tries to delete the team — but it uses the anonymous client, which has no delete permission, so **the rollback does nothing**. And if the user simply closes the Stripe tab, nothing cleans up the unpaid team. Nothing reads the `?canceled=1` flag.
- **Why it matters:** Over a public weekend these ghost teams accumulate. Each one **burns a PIN**, **inflates your "X/36 spots taken" counter**, and — the worst part — **permanently reserves the team name**, so when the same person comes back to finish, they're told *"that team name is taken"* by their own abandoned row (see B/UX chain with the name check).
- **Fix:** Make the whole registration write a single transactional `SECURITY DEFINER` RPC (all-or-nothing). Add cleanup for stale unpaid teams. Make the "name taken" check ignore the user's own unpaid/abandoned row. Show a "your payment was canceled — your spot isn't held" banner on `?canceled=1`.
- **Who:** Me (code + a SQL migration you run). **Needs one decision from you — see §9.**

### B4 — Confirmation page leaks a real team's PIN
- **Where:** `app/confirmation/page.tsx:13`
- **What happens:** If someone lands on `/confirmation` without the right URL parameters (bookmark, Stripe stripping params, direct navigation), the page falls back to PIN **`4821`** and team **"Your Team."** `4821` is the actual day-of PIN of the seeded "Nittany Drivers" team.
- **Why it matters:** It hands a stranger working credentials to another team's day-of app.
- **Fix:** Remove the hardcoded fallbacks. If the PIN/team are missing, show a "we couldn't find your confirmation — check your email or contact us" message.
- **Who:** Me (code). Quick.

### B5 — Admin has no authentication (carried over from June 6)
- **Where:** `app/admin/login/page.tsx:18`; no `middleware.ts`; RLS grants in `schema.sql` + every `add_*.sql`
- **What happens:** The login accepts **any email and a blank password** and never calls Supabase auth. There's no middleware protecting `/admin`. On top of that, the database itself grants the anonymous key read access to registrant info and execute access on every admin write function.
- **Why it matters:** Anyone who learns the URL can read every registrant's **name, email, phone, and PIN**, and can **mark teams paid** or delete sponsors/donors — and could even do it with a raw API call, no login. This is a privacy and data-integrity exposure the moment you share anything pointing at the site.
- **Fix:** Implement real `supabase.auth.signInWithPassword` + create one admin user; add `middleware.ts` on `/admin/:path*` that redirects to login without a session; tighten the anon grants so PII reads and admin writes require an authenticated session. (A middleware gate was built before in commit `36fa02f` but reverted because login was a mock — so the gate exists in git history and just needs real login behind it.)
- **Who:** Me (code) + You (create the Supabase auth user, run the RLS SQL). **Needs a quick decision on the auth approach — see §9.**

### B6 — "Total raised" on the admin dashboard always shows $0
- **Where:** `app/admin/page.tsx:44`; `registration` table RLS in `schema.sql:223`
- **What happens:** The Overview reads the `registration` table directly from the browser, but that table has no read policy for an unauthenticated client, so the query returns zero rows. Your headline money number reads **$0**.
- **Why it matters:** You can't see how the event is doing at a glance, and it undercuts trust in the whole dashboard.
- **Fix:** Read the total through the existing `total_raised()` security-definer RPC (which is already paid-only), or add a scoped read policy once admin auth exists.
- **Who:** Me (code). Small.

### B7 — Fake sponsors/donors show on the public page
- **Where:** `app/components/SponsorsSection.tsx:23` (fallback "Sponsor A/B/C"); seed data in `supabase/seed.sql`
- **What happens:** If the real sponsor/donor records aren't entered, the public registration page shows placeholder names.
- **Why it matters:** It's on the same page prospective registrants see — looks unfinished.
- **Fix:** Enter the real sponsors/donors via the (now working) admin pages, or confirm the seed placeholders are gone before launch.
- **Who:** You (data entry via admin). The tools to do this shipped this session.

### B8 — Course and Announcements admin pages are fake
- **Where:** `app/admin/course/page.tsx:47` (Save has no action; shows mock sponsors); `app/admin/announcements/page.tsx:16-57` (local state only)
- **What happens:** The Course page's "Save changes" button does nothing and its dropdowns show fake "Sponsor A/B/C." The Announcements page only updates the screen — **posts are never saved and never reach golfers** — yet "New announcement" is the primary button on your Overview.
- **Why it matters:** You'd believe you'd set up the course or broadcast to players when nothing happened.
- **Fix:** Rebuild both against the database (Announcements needs a `save_announcement` RPC; the `announcement` table already exists), **or** pull them from the admin nav until they're built so they can't mislead you.
- **Who:** Me (code) + a decision on rebuild-now vs hide-for-now — see §9. *Note: not strictly needed for the registration weekend, but Announcements is wired to your Overview's main CTA, so at minimum it should be hidden.*

---

## 4. 🟡 Should-fix before the event (not launch blockers)

| # | Where | Issue | Fix |
|---|---|---|---|
| S1 | `RegisterSection.tsx:110,287` | Donation field accepts negative/garbage values → lowers the charge | Clamp to `max(0, floor(n))`, reject non-numbers (server recompute in B1 also covers it) |
| S2 | `RegisterSection.tsx:323` | Double-clicking "Pay" can create two teams | Guard the handler with a ref, not just the `disabled` flag |
| S3 | `register.ts:68-160` | If the catalog query fails, add-ons silently aren't saved but the full total is still charged | Treat a failed/empty catalog as a hard error and stop |
| S4 | `registrations/page.tsx:70-87`, `checkin/page.tsx:63-85` | Failed save/paid/arrived RPCs are swallowed — UI says "saved," DB unchanged; optimistic updates never roll back | Surface the error and revert on failure (copy the sponsors/donors pattern that already does this) |
| S5 | `RegisterSection.module.css` | On mobile, the order summary/total renders **below the entire form** — people pay without seeing the itemized total | Move summary above the steps on mobile, or add a sticky total bar |
| S6 | `app/admin/foursomes/` | Orphan empty directory, not linked anywhere | Delete it |
| S7 | code vs backlog | Two prod URLs referenced (`psu-cincy-golf.vercel.app` in code vs `penn-state-topaz.vercel.app` in the backlog) | Confirm the one canonical URL |

---

## 5. Play app (Phase 2 — August) — findings, NOT blocking this weekend

The day-of golfer app is **substantially built and wired to real Supabase data** — scores, mulligans, leaderboard, chat, and the "owe" tab all persist and compute live. The PRD and the audit both confirm it's **Phase 2 for the August 30 event**, so none of the below blocks the registration launch. Captured here so nothing is lost; full entries are in the vault backlog.

- **No `/play` login gate** — a visitor with no cookie falls back to a real team ("Nittany Drivers") and could edit its data. Needs middleware before August. (`lib/getTeamId.ts:8`)
- **"Your Advantages" mis-buckets** gimme ropes, raffle tickets, and mulligans as advantage cards. (`home/GameCards.tsx:46`)
- **Scorecard mulligan set-to-zero never deletes the row** → the "owe" tab over-charges. (`scorecard/page.tsx:152`)
- **Contest "Add $10 to tab" can double-charge** on a slow double-tap. (`scorecard/page.tsx:257`)
- **Leaderboard prints "thru N" twice** and dropped player names. (`leaderboard/page.tsx:102`)
- **Sponsor logos are blank** in the play app (it never reads `logo_url`). (`scorecard/page.tsx:244`, `sponsors/page.tsx:63`)
- **"Owe" page links to bare `zeffy.com`**, not your campaign. (`owe/page.tsx:114`)
- **PRD-promised offline score entry is not implemented** — direct writes only; flag for an on-course test if Beckett Ridge has spotty cell coverage.

---

## 6. What shipped this session ✅ (already live on Vercel)

1. **Sponsor logos** — admin upload → public site. Fixed a silent save failure (the `tier` enum cast) via `supabase/fix_save_sponsor.sql`.
2. **Donors fully editable** — add/edit/delete + logo upload; public page now shows the donor logo and what they donated.
3. **Hero image** — new `Admin → Settings` page sets the hero photo. (The slot is a **4:1 banner — 1132×280 displayed; design at 2264×560.** A portrait flyer will crop badly; I can reshape the slot to fit a flyer if you want.)
4. **Admin Overview** — live data + a **Solo golfers** panel showing who still needs a partner.
5. **Solo golfer pairing** — merges two solos into one real team (keeps Team A's name + PIN, both payments preserved). Button + modal on the Teams page.
6. **Team PINs** visible on the admin Teams page for day-of support.
7. **Solo add-on filtering** — solos only see per-golfer add-ons; team-level items (gimme rope, advantage cards) are hidden so they don't duplicate what the full team buys after pairing.
8. **Check-in** — wired to real teams/players/purchases (mark arrived, add to tab, mark paid).

---

## 7. Email — options and recommendation

You asked me to confirm there's "no API connect" and "no other service that does this." Being straight with you: **both are slightly off, and it changes the answer.**

- **There IS a Gmail API** (with OAuth) that sends *as* your real address — it's just heavier to set up than an app password.
- **The reason no service (Resend/SendGrid/etc.) can send from your Gmail** is Gmail's own anti-spoofing rule (DMARC), not a missing feature. So your instinct is right that `onboarding@resend.dev` looks like spam — but switching the address doesn't help, because **none of them can be `@gmail.com`.**

| Path | From your Gmail? | Effort | Notes |
|---|---|---|---|
| Gmail SMTP (app password) | ✅ | Easiest | **Blocked** — app passwords aren't available on your account |
| Gmail API (OAuth) | ✅ | Heavy | Works, most setup |
| **Zapier** (Gmail action) | ✅ | Low–Med | App → webhook → Zapier sends as you. Free tier covers ~36 teams. **Best fit given app passwords are dead and you're open to Zapier.** |
| n8n | ✅ | Med | Same idea, self-hosted, unlimited free |
| Resend + a chapter domain (~$12/yr) | ❌ (from `golf@yourchapter.org`) | Low | Arguably looks *more* official than a personal Gmail; replies still route to your inbox |

**Recommendation:** **Zapier** if "must be from my Gmail" is firm; **a cheap chapter domain + Resend** if you'd accept a branded `golf@…` address (cleanest in-app, and replies still come to you). Either way, email is **not** a hard launch blocker — registrants still see their PIN on the confirmation screen — but the confirmation email and the solo-pairing notification both wait on this choice. (Full write-up saved in your vault: `psu-golf-email-decision`.)

---

## 8. Recommended action plan (in order)

**Phase 1 — before the link goes public (I do the code; you do the Supabase steps with me):**
1. B1 + B2 — server-side total + webhook validation *(payment integrity — top priority)*
2. B4 — remove the leaked-PIN fallback *(quick)*
3. B3 — transactional registration write + abandoned-team cleanup + name-check fix
4. B5 — real admin login + `/admin` middleware + tighten database permissions
5. B6 — fix the "Total raised" $0
6. B8 — at minimum hide Course + Announcements from the admin nav so they can't mislead
7. B7 — you enter real sponsors/donors; we confirm no placeholders remain
8. One full end-to-end test: solo, 2-person, add-ons, challenge, donation, double-click Pay, and a canceled checkout

**Phase 2 — before August 30 (day-of app):** play-app auth gate, the scorecard/leaderboard/contest bug fixes, sponsor logos in the play app, real Zeffy link, and an on-course test.

**Anytime:** the should-fix list (§4) and the streamlining items (shared admin save/upload helper, shared play-app bottom nav).

---

## 9. Decisions I need from you

1. **Timing:** Can the registration link's timing flex by a day or two so Phase 1 fixes land first? (Strongly recommended.)
2. **Team names:** Must they be unique? (Drives the B3 fix — a real database rule + handling the user's own abandoned row, vs. dropping the "name taken" block entirely.)
3. **Registration write:** Prefer (a) write only after payment succeeds, or (b) keep writing before payment but add automatic cleanup of abandoned teams? (a) is cleaner; (b) is a smaller change.
4. **Admin auth:** One shared admin password is simplest. Good enough, or do you want individual logins for other board members?
5. **Course + Announcements:** Rebuild them against the database now, or hide them from the nav until after the event?
6. **Email:** Zapier-from-your-Gmail, or a cheap chapter domain + Resend?
7. **Hero image:** Keep the 4:1 banner (and design a banner to fit), or should I reshape the slot to fit a portrait flyer?

---

## 10. Appendix — per-page status

**Admin**
| Page | Status |
|---|---|
| login | ❌ mock auth (accepts anything) |
| layout / shell | ❌ no auth guard |
| Overview | ⚠️ live, but "Total raised" = $0 |
| Registrations | ⚠️ works; save errors swallowed |
| Check-in | ⚠️ works; optimistic writes, no rollback |
| Sponsors | ✅ real CRUD + logo upload |
| Donors | ✅ real CRUD + CSV + logo |
| Catalog | ✅ real (minor contest-tag edge case) |
| Course | ❌ mock data; Save does nothing |
| Schedule | ✅ real |
| Included | ✅ real |
| Announcements | ❌ local state only; never reaches players |
| Settings | ✅ real (hero image) |
| foursomes/ | ❌ orphan empty dir — delete |

**Play (Phase 2)**
| Page | Status |
|---|---|
| PIN login | ✅ real |
| Home | ✅ real (hardcoded hole-7 fallback) |
| GameCards | ⚠️ advantage-bucketing bug |
| Scorecard | ⚠️ mulligan-zero + double-charge bugs |
| Leaderboard | ⚠️ duplicate "thru," no names |
| Mulligans | ✅ real |
| Owe | ⚠️ bare Zeffy link; depends on scorecard fix |
| Chat | ⚠️ real; "is me" highlight quirk |
| Sponsors | ⚠️ real; logos blank |

**Registration/payment:** UI ✅ polished; payment integrity ❌ (B1/B2); data lifecycle ❌ (B3); confirmation ❌ (B4).

---

*Compiled from three independent audit agents. All findings are read-only — no code was changed by the audit. The features built earlier this session were committed and deployed normally. Ready to start Phase 1 fixes on your go.*
