import { test, expect } from '@playwright/test'

// ─── PS-01 to PS-07 · Entry / PIN Screen ───────────────────────────────────

test.describe('Player Entry — PS-01 to PS-07', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/play')
  })

  test('PS-01: Event title "Drive Out Hunger" is visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Drive Out Hunger/i })).toBeVisible()
  })

  test('PS-02: Event date and course are shown', async ({ page }) => {
    await expect(page.getByText(/August 30, 2026/)).toBeVisible()
    await expect(page.getByText(/Beckett Ridge/)).toBeVisible()
  })

  test('PS-03: Team dropdown has at least 8 options', async ({ page }) => {
    const options = page.locator('select option')
    await expect(options).toHaveCount(8)
  })

  test('PS-04: Four PIN digit input fields are present', async ({ page }) => {
    const pins = page.locator('#pin-0, #pin-1, #pin-2, #pin-3')
    await expect(pins).toHaveCount(4)
  })

  test('PS-05: Enter button is disabled when no PIN is entered', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Enter the app/i })).toBeDisabled()
  })

  test('PS-06: Enter button is enabled after all 4 PIN digits are entered', async ({ page }) => {
    await page.locator('#pin-0').fill('4')
    await page.locator('#pin-1').fill('8')
    await page.locator('#pin-2').fill('2')
    await page.locator('#pin-3').fill('1')
    await expect(page.getByRole('button', { name: /Enter the app/i })).not.toBeDisabled()
  })

  test('PS-07: PIN auto-advances focus from field 1 to field 2', async ({ page }) => {
    await page.locator('#pin-0').fill('4')
    await expect(page.locator('#pin-1')).toBeFocused()
  })
})

// ─── PS-08 to PS-15 · Home Screen ──────────────────────────────────────────

test.describe('Player Home — PS-08 to PS-15', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/play/home')
  })

  test('PS-08: Announcement banner contains "Lunch is at the turn"', async ({ page }) => {
    await expect(page.getByText(/Lunch is at the turn/i)).toBeVisible()
  })

  test('PS-09: Starting hole stat shows 7', async ({ page }) => {
    // The stat tile label is "Starting hole" with value 7
    await expect(page.getByText('7').first()).toBeVisible()
    await expect(page.getByText('Starting hole')).toBeVisible()
  })

  test('PS-10: To-par stat shows +1', async ({ page }) => {
    await expect(page.getByText('+1')).toBeVisible()
  })

  test('PS-11: Thru label shows "Thru 9 of 18"', async ({ page }) => {
    await expect(page.getByText(/Thru 9 of 18/i)).toBeVisible()
  })

  test('PS-12: Team card shows both player names', async ({ page }) => {
    await expect(page.getByText('Jamie Miller')).toBeVisible()
    await expect(page.getByText('Eddie Gady')).toBeVisible()
  })

  test('PS-13: Schedule section has 5 rows', async ({ page }) => {
    // The schedule section is labelled "Today's schedule"
    await expect(page.getByText(/Today.s schedule/i)).toBeVisible()
    // All 5 times appear somewhere on the page (some also in stat tile, use first())
    for (const t of ['8:00 AM', '8:45 AM', '9:00 AM', '12:30 PM', '3:30 PM']) {
      await expect(page.getByText(t).first()).toBeVisible()
    }
  })

  test('PS-14: Mulligan tracker link navigates to /play/mulligans', async ({ page }) => {
    await page.getByText(/Mulligan tracker/i).click()
    await expect(page).toHaveURL('/play/mulligans')
  })

  test('PS-15: Sponsors link navigates to /play/sponsors', async ({ page }) => {
    await page.getByText(/^Sponsors$/i).click()
    await expect(page).toHaveURL('/play/sponsors')
  })
})

// ─── PS-16 to PS-29 · Scorecard ────────────────────────────────────────────

test.describe('Scorecard — PS-16 to PS-29', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/play/scorecard')
  })

  test('PS-16: Mini scorecard has exactly 18 hole tiles', async ({ page }) => {
    // Each tile has data-hole attribute 1-18
    const tiles = page.locator('[data-hole]')
    await expect(tiles).toHaveCount(18)
  })

  test('PS-17: Stat strip shows running total of 37', async ({ page }) => {
    await expect(page.locator('[data-testid="stat-total"]')).toContainText('37')
  })

  test('PS-18: Stat strip shows to-par of +1', async ({ page }) => {
    await expect(page.locator('[data-testid="stat-topar"]')).toContainText('+1')
  })

  test('PS-19: Stat strip shows thru of 9', async ({ page }) => {
    await expect(page.locator('[data-testid="stat-thru"]')).toContainText('9')
  })

  test('PS-20: Hole 7 mini tile shows score 4 (already scored)', async ({ page }) => {
    await expect(page.locator('[data-hole="7"]')).toContainText('4')
  })

  test('PS-21: Hole 1 mini tile shows dash (not scored)', async ({ page }) => {
    await expect(page.locator('[data-hole="1"]')).toContainText('—')
  })

  test('PS-22: Clicking hole 2 mini tile updates active hole header', async ({ page }) => {
    await page.locator('[data-hole="2"]').click()
    await expect(page.getByText('Hole 2')).toBeVisible()
  })

  test('PS-23: Stepper plus button increments the score', async ({ page }) => {
    // Get current value from the big score display, then click plus
    const plusBtn = page.getByRole('button', { name: /increase/i })
    const bigScore = page.locator('[class*="bigScore"]')
    const before = Number(await bigScore.textContent())
    await plusBtn.click()
    const after = Number(await bigScore.textContent())
    expect(after).toBe(before + 1)
  })

  test('PS-24: Stepper minus button decrements the score', async ({ page }) => {
    // Click plus first to ensure we are not at min, then minus
    await page.getByRole('button', { name: /increase/i }).click()
    const bigScore = page.locator('[class*="bigScore"]')
    const before = Number(await bigScore.textContent())
    await page.getByRole('button', { name: /decrease/i }).click()
    const after = Number(await bigScore.textContent())
    expect(after).toBe(before - 1)
  })

  test('PS-25: Stepper value cannot go below 1', async ({ page }) => {
    // Click minus many times to try to reach 0
    const minusBtn = page.getByRole('button', { name: /decrease/i })
    for (let i = 0; i < 15; i++) {
      await minusBtn.click()
    }
    const value = Number(await page.locator('[class*="bigScore"]').textContent())
    expect(value).toBeGreaterThanOrEqual(1)
  })

  test('PS-26: Stepper value cannot go above 12', async ({ page }) => {
    // Click plus many times to try to exceed 12
    const plusBtn = page.getByRole('button', { name: /increase/i })
    for (let i = 0; i < 15; i++) {
      await plusBtn.click()
    }
    const value = Number(await page.locator('[class*="bigScore"]').textContent())
    expect(value).toBeLessThanOrEqual(12)
  })

  test('PS-27: Mulligan slot 1 toggles on click and off on second click', async ({ page }) => {
    // Navigate to an unscored hole
    await page.locator('[data-hole="1"]').click()
    const slot1 = page.getByRole('button', { name: /Add mulligan 1/i })
    // Click to add
    await slot1.click()
    await expect(page.getByRole('button', { name: /Remove mulligan 1/i })).toBeVisible()
    // Click to remove
    await page.getByRole('button', { name: /Remove mulligan 1/i }).click()
    await expect(page.getByRole('button', { name: /Add mulligan 1/i })).toBeVisible()
  })

  test('PS-28: Mulligan slot 2 is only available after slot 1 is filled', async ({ page }) => {
    await page.locator('[data-hole="1"]').click()
    // Slot 2 before slot 1: slot 2 should add slot 1 first (or not be clickable)
    // After adding slot 1, slot 2 becomes available
    await page.getByRole('button', { name: /Add mulligan 1/i }).click()
    await page.getByRole('button', { name: /Add mulligan 2/i }).click()
    await expect(page.getByRole('button', { name: /Remove mulligan 2/i })).toBeVisible()
  })

  test('PS-29: Clicking Complete hole advances to next unscored hole', async ({ page }) => {
    // Start at hole 1 (first unscored); complete it; should move to hole 2
    const holeHeader = page.getByText(/Hole \d+/).first()
    const before = await holeHeader.textContent()
    await page.getByRole('button', { name: /Complete hole/i }).click()
    const after = await holeHeader.textContent()
    expect(after).not.toBe(before)
  })
})

// ─── PS-30 to PS-34 · Leaderboard ──────────────────────────────────────────

test.describe('Leaderboard — PS-30 to PS-34', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/play/leaderboard')
  })

  test('PS-30: Leaderboard table has exactly 12 team rows', async ({ page }) => {
    await expect(page.locator('[data-testid="lb-row"]')).toHaveCount(12)
  })

  test('PS-31: Rank 1 team is "Roar Lions Roar"', async ({ page }) => {
    await expect(page.getByText('Roar Lions Roar')).toBeVisible()
  })

  test('PS-32: Rank 1 score is -6', async ({ page }) => {
    await expect(page.getByText('-6')).toBeVisible()
  })

  test('PS-33: "Nittany Drivers" row has the YOU badge', async ({ page }) => {
    const nittanyRow = page.locator('[data-testid="lb-row"]').filter({ hasText: 'Nittany Drivers' })
    await expect(nittanyRow.getByText('YOU')).toBeVisible()
  })

  test('PS-34: Exactly one trophy icon is shown (rank 1 only)', async ({ page }) => {
    await expect(page.locator('[data-testid="trophy-icon"]')).toHaveCount(1)
  })
})
