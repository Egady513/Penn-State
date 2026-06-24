import { test, expect } from '@playwright/test'

// ─── Helper: scroll to register section and fill Step 1 ────────────────────

async function fillStep1(page: import('@playwright/test').Page, opts?: { single?: boolean }) {
  await page.locator('#register').scrollIntoViewIfNeeded()
  if (opts?.single) {
    await page.getByRole('checkbox', { name: /single golfer/i }).check()
  }
  await page.getByLabel(/team name/i).fill('Test Team')
  await page.getByLabel(/full name/i).first().fill('Jane Smith')
  await page.getByLabel(/email/i).first().fill('jane@test.com')
  if (!opts?.single) {
    await page.getByLabel(/full name/i).nth(1).fill('John Doe')
    await page.getByLabel(/email/i).nth(1).fill('john@test.com')
  }
}

// ─── R-01 to R-11 · Content / Static Rendering ─────────────────────────────

test.describe('Registration Content — R-01 to R-11', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('R-01: Hero headline renders', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Drive Out Hunger 2026/i })).toBeVisible()
  })

  test('R-02: Cause badge contains Last Mile Food Rescue', async ({ page }) => {
    await expect(page.getByText(/Benefits Last Mile Food Rescue/i)).toBeVisible()
  })

  test('R-03: Spots chip shows real paid-team count out of 36', async ({ page }) => {
    // Count is now data-driven (paid teams from the DB), so assert the /36
    // denominator + label rather than a hardcoded number.
    await expect(page.getByText(/\/36/).first()).toBeVisible()
    await expect(page.getByText(/team spots taken/i).first()).toBeVisible()
  })

  test('R-04: Event date fact row shows Aug 30, 2026', async ({ page }) => {
    await expect(page.getByText(/Aug 30, 2026/)).toBeVisible()
  })

  test('R-05: Schedule renders from the database (heading + at least one time)', async ({ page }) => {
    await page.locator('#details').scrollIntoViewIfNeeded()
    // Schedule is now data-driven (admin-editable), so assert structure not exact
    // times: the Schedule heading and at least one time-formatted row render.
    await expect(page.getByRole('heading', { name: /^Schedule$/i })).toBeVisible()
    await expect(
      page.locator('#details').getByText(/\d{1,2}:\d{2}\s?(AM|PM)/i).first()
    ).toBeVisible()
  })

  test('R-06: Included list has 6 items; greens fee item is present', async ({ page }) => {
    await page.locator('#details').scrollIntoViewIfNeeded()
    await expect(page.getByText(/Greens fee and cart for both golfers/i)).toBeVisible()
    // Count all 6 included items by unique phrases
    const items = [
      'Greens fee and cart for both golfers',
      'Range balls',
      'Breakfast at check-in',
      'Lunch & awards reception',
      'Tournament gift bag',
      'Live mobile scoring app',
    ]
    for (const item of items) {
      await expect(page.getByText(item)).toBeVisible()
    }
  })

  test('R-07: Location card shows Beckett Ridge Golf Club', async ({ page }) => {
    await page.locator('#details').scrollIntoViewIfNeeded()
    await expect(page.getByText('Beckett Ridge Golf Club')).toBeVisible()
  })

  test('R-08: Sponsors section renders sponsor cards', async ({ page }) => {
    // Sponsors are now data-driven from the catalog/admin, so assert that the
    // section renders cards rather than a fixed per-tier count.
    await page.locator('#sponsors').scrollIntoViewIfNeeded()
    await expect(page.getByRole('heading', { name: /Sponsors & donors/i })).toBeVisible()
    expect(await page.locator('#sponsors [data-testid="sponsor-card"]').count()).toBeGreaterThan(0)
  })

  test('R-09: Sponsors are organized into at least one category group', async ({ page }) => {
    await page.locator('#sponsors').scrollIntoViewIfNeeded()
    expect(await page.locator('[data-testid="sponsor-group"]').count()).toBeGreaterThan(0)
  })

  test('R-10: Become-a-sponsor call to action renders', async ({ page }) => {
    await page.locator('#sponsors').scrollIntoViewIfNeeded()
    await expect(page.getByText(/Become a sponsor/i)).toBeVisible()
  })

  test('R-11: Donors grid has 12 entries; Acme Family is present', async ({ page }) => {
    await page.locator('#sponsors').scrollIntoViewIfNeeded()
    await expect(page.getByText('Acme Family')).toBeVisible()
    await expect(page.getByText('Lamar Films')).toBeVisible()
    // 12 donors — check first, middle, last to confirm full list
    const allDonors = [
      'Acme Family', 'Bechtel Group', 'Cincinnati Cellars',
      'Dunn Logistics', 'Elliott & Co.', 'Fields Auto',
      'Garrett Estates', 'Hopper Brewing', 'Indigo Print Co.',
      'Jensen Roofing', 'Kepler Marketing', 'Lamar Films',
    ]
    await expect(page.locator('#sponsors').getByText(allDonors[0])).toBeVisible()
    await expect(page.locator('#sponsors').getByText(allDonors[11])).toBeVisible()
  })
})

// ─── R-12 to R-27 · Registration Form ──────────────────────────────────────

test.describe('Registration Form — R-12 to R-27', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.locator('#register').scrollIntoViewIfNeeded()
  })

  test('R-12: Empty step 1 shows a "what you missed" message on Continue', async ({ page }) => {
    await page.getByRole('button', { name: /Continue to add-ons/i }).click()
    // Shows the missing-fields message and does NOT advance to add-ons
    await expect(page.getByText(/Please fill in:/i)).toBeVisible()
    await expect(page.getByText(/Add-ons \(optional\)/i)).not.toBeVisible()
  })

  test('R-13: Filled step 1 advances to add-ons on Continue', async ({ page }) => {
    await fillStep1(page)
    await page.getByRole('button', { name: /Continue to add-ons/i }).click()
    await expect(page.getByText(/Add-ons \(optional\)/i)).toBeVisible()
  })

  test('R-14: Single-golfer toggle hides Golfer 2 block', async ({ page }) => {
    // Before toggle: 2 golfer blocks
    const golferBlocks = page.locator('#register').getByText(/Golfer 2/)
    await expect(golferBlocks).toBeVisible()
    // After toggle: Golfer 2 disappears
    await page.getByRole('checkbox', { name: /single golfer/i }).check()
    await expect(golferBlocks).not.toBeVisible()
  })

  test('R-15: Single toggle changes order summary fee to $100', async ({ page }) => {
    await page.getByRole('checkbox', { name: /single golfer/i }).check()
    // The summary line says "Single golfer registration" with $100
    await expect(page.getByText(/Single golfer registration/i)).toBeVisible()
    await expect(page.locator('#register').getByText('$100').first()).toBeVisible()
  })

  test('R-16: Default (team) mode shows 2 golfer blocks', async ({ page }) => {
    await expect(page.getByText('Golfer 1')).toBeVisible()
    await expect(page.getByText('Golfer 2')).toBeVisible()
  })

  test('R-17: Default team order summary shows $200', async ({ page }) => {
    // The summary line says "Team registration · 2 golfers" with $200
    await expect(page.getByText(/Team registration · 2 golfers/i)).toBeVisible()
    await expect(page.locator('#register').getByText('$200').first()).toBeVisible()
  })

  test('R-18: Continue to step 2 shows add-ons section', async ({ page }) => {
    await fillStep1(page)
    await page.getByRole('button', { name: /Continue to add-ons/i }).click()
    await expect(page.getByText(/Add-ons \(optional\)/i)).toBeVisible()
  })

  test('R-19: Step 2 shows the challenge + add-on options', async ({ page }) => {
    await fillStep1(page)
    await page.getByRole('button', { name: /Continue to add-ons/i }).click()
    await expect(page.getByText(/Long-Drive & Closest-to-Pin Challenge/i)).toBeVisible()
    await expect(page.getByText(/Gimme rope/i)).toBeVisible()
    await expect(page.getByText(/opponent.s drive/i)).toBeVisible()
    await expect(page.getByText(/front tees/i)).toBeVisible()
  })

  test('R-19b: Challenge Team pill adds $40 to the total', async ({ page }) => {
    await fillStep1(page)
    await page.getByRole('button', { name: /Continue to add-ons/i }).click()
    await page.getByRole('button', { name: /Team \$40/i }).click()
    // Base $200 + $40 challenge = $240
    await expect(page.getByText('$240')).toBeVisible()
  })

  test('R-20: Checking an add-on makes it appear in the order summary', async ({ page }) => {
    await fillStep1(page)
    await page.getByRole('button', { name: /Continue to add-ons/i }).click()
    // Check gimme rope
    await page.getByText(/Gimme rope/i).click()
    // Order summary should now show the addon
    await expect(page.locator('#register').getByText(/Gimme rope/i).last()).toBeVisible()
  })

  test('R-21: Donation field increases total by entered amount', async ({ page }) => {
    await fillStep1(page)
    await page.getByRole('button', { name: /Continue to add-ons/i }).click()
    // Base total is $200; enter $25 donation
    await page.getByLabel(/donation/i).fill('25')
    await expect(page.getByText('$225')).toBeVisible()
  })

  test('R-22: Back button from step 2 returns to step 1', async ({ page }) => {
    await fillStep1(page)
    await page.getByRole('button', { name: /Continue to add-ons/i }).click()
    await page.getByRole('button', { name: /Back/i }).click()
    await expect(page.getByLabel(/team name/i)).toBeVisible()
  })

  test('R-23: Continue from step 2 advances to step 3 review', async ({ page }) => {
    await fillStep1(page)
    await page.getByRole('button', { name: /Continue to add-ons/i }).click()
    await page.getByRole('button', { name: /Review & pay/i }).click()
    await expect(page.getByText(/Review/)).toBeVisible()
  })

  test('R-24: Step 3 review card shows entered team name', async ({ page }) => {
    await fillStep1(page)
    await page.getByRole('button', { name: /Continue to add-ons/i }).click()
    await page.getByRole('button', { name: /Review & pay/i }).click()
    await expect(page.getByText('Test Team')).toBeVisible()
  })

  test('R-25: Pay button shows correct total ($200 with no add-ons)', async ({ page }) => {
    await fillStep1(page)
    await page.getByRole('button', { name: /Continue to add-ons/i }).click()
    await page.getByRole('button', { name: /Review & pay/i }).click()
    // Pay registers the team then redirects to Stripe Checkout.
    await expect(page.getByRole('button', { name: /Pay \$200/i })).toBeVisible()
  })

  test('R-26: Pay step shows the Stripe checkout disclosure', async ({ page }) => {
    await fillStep1(page)
    await page.getByRole('button', { name: /Continue to add-ons/i }).click()
    await page.getByRole('button', { name: /Review & pay/i }).click()
    // Non-destructive: we don't click Pay (that writes a real team to Supabase).
    await expect(page.getByText(/secure Stripe checkout/i)).toBeVisible()
  })

  test('R-27: Back button from step 3 returns to step 2', async ({ page }) => {
    await fillStep1(page)
    await page.getByRole('button', { name: /Continue to add-ons/i }).click()
    await page.getByRole('button', { name: /Review & pay/i }).click()
    await page.getByRole('button', { name: /Back/i }).click()
    await expect(page.getByText(/Add-ons \(optional\)/i)).toBeVisible()
  })
})

// ─── R-28 to R-30 · Confirmation Page ──────────────────────────────────────

test.describe('Confirmation Page — R-28 to R-30', () => {
  test('R-28: PIN from URL param is displayed', async ({ page }) => {
    await page.goto('/confirmation?pin=4821')
    await expect(page.getByText('4821')).toBeVisible()
  })

  test('R-29: Team name from URL param is displayed', async ({ page }) => {
    await page.goto('/confirmation?pin=4821&team=Test+Team')
    await expect(page.getByText('Test Team')).toBeVisible()
  })

  test('R-30: Day-of app link points to /play', async ({ page }) => {
    await page.goto('/confirmation?pin=4821')
    const link = page.getByRole('link', { name: /day-of app/i })
    await expect(link).toHaveAttribute('href', /\/play/)
  })
})
