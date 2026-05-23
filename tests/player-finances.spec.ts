import { test, expect } from '@playwright/test'

// ─── PF-01 to PF-07 · Mulligans ────────────────────────────────────────────

test.describe('Mulligans — PF-01 to PF-07', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/play/mulligans')
  })

  test('PF-01: Summary card shows 4 total mulligans used', async ({ page }) => {
    // The summary card shows "Used today" with the count
    const summaryCard = page.locator('[class*="summaryCard"]')
    await expect(summaryCard).toContainText('4')
    await expect(page.getByText('Used today')).toBeVisible()
  })

  test('PF-02: Summary card shows $8 owed', async ({ page }) => {
    // The summary card shows "You owe" with the dollar amount
    await expect(page.getByText('You owe')).toBeVisible()
    await expect(page.getByText('$8')).toBeVisible()
  })

  test('PF-03: Hole list has exactly 18 rows', async ({ page }) => {
    // Each hole row contains the hole number and controls
    const rows = page.locator('[class*="holeRow"]')
    await expect(rows).toHaveCount(18)
  })

  test('PF-04: Plus button is disabled on a hole that already has 2 mulligans', async ({ page }) => {
    // Hole 9 (index 8, 0-based) starts with 2 mulligans in mock data
    const hole9 = page.locator('[class*="holeRow"]').nth(8)
    await expect(hole9.getByRole('button', { name: /Add mulligan/i })).toBeDisabled()
  })

  test('PF-05: Minus button is disabled on a hole with 0 mulligans', async ({ page }) => {
    // Hole 1 (index 0) starts with 0 mulligans
    const hole1 = page.locator('[class*="holeRow"]').nth(0)
    await expect(hole1.getByRole('button', { name: /Remove mulligan/i })).toBeDisabled()
  })

  test('PF-06: Clicking plus on a hole with 0 mulligans increments the owe total', async ({ page }) => {
    const oweValue = page.locator('[class*="oweValue"]')
    const before = await oweValue.textContent()
    // Hole 1 (index 0) starts with 0 mulligans — safe to add
    const hole1 = page.locator('[class*="holeRow"]').nth(0)
    await hole1.getByRole('button', { name: /Add mulligan/i }).click()
    const after = await oweValue.textContent()
    expect(after).not.toBe(before)
  })

  test('PF-07: A hole with 2 mulligans shows "max reached" text', async ({ page }) => {
    // Hole 9 (index 8) has 2 mulligans in mock data
    const hole9 = page.locator('[class*="holeRow"]').nth(8)
    await expect(hole9.getByText(/max reached/i)).toBeVisible()
  })
})

// ─── PF-08 to PF-12 · What You Owe ─────────────────────────────────────────

test.describe('What You Owe — PF-08 to PF-12', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/play/owe')
  })

  test('PF-08: Total due shows the correct unpaid amount ($63)', async ({ page }) => {
    // Unpaid: $8 (mulligans) + $20 (long-drive) + $20 (advantage cards) + $15 (raffle) = $63
    await expect(page.getByText('$63')).toBeVisible()
  })

  test('PF-09: Line items section has exactly 7 rows', async ({ page }) => {
    const rows = page.locator('[class*="itemRow"]')
    await expect(rows).toHaveCount(7)
  })

  test('PF-10: Registration row shows a Paid badge', async ({ page }) => {
    const regRow = page.locator('[class*="itemRow"]').filter({ hasText: /Registration/i })
    await expect(regRow.getByText('Paid')).toBeVisible()
  })

  test('PF-11: Mulligans row shows an Unpaid badge', async ({ page }) => {
    const mullRow = page.locator('[class*="itemRow"]').filter({ hasText: /Mulligans/i })
    await expect(mullRow.getByText('Unpaid')).toBeVisible()
  })

  test('PF-12: Subtitle shows "Settle at the tent" when balance is unpaid', async ({ page }) => {
    await expect(page.getByText(/Settle at the tent/i)).toBeVisible()
  })
})

// ─── PF-13 to PF-15 · Player Sponsors ──────────────────────────────────────

test.describe('Player Sponsors — PF-13 to PF-15', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/play/sponsors')
  })

  test('PF-13: Eagle tier has 2 sponsor cards', async ({ page }) => {
    await expect(page.locator('[data-testid="tier-eagle"] [data-testid="sponsor-card"]')).toHaveCount(2)
  })

  test('PF-14: Birdie tier has 3 sponsor cards', async ({ page }) => {
    await expect(page.locator('[data-testid="tier-birdie"] [data-testid="sponsor-card"]')).toHaveCount(3)
  })

  test('PF-15: Par tier has 4 sponsor cards', async ({ page }) => {
    await expect(page.locator('[data-testid="tier-par"] [data-testid="sponsor-card"]')).toHaveCount(4)
  })
})

// ─── PF-16 to PF-22 · Bottom Navigation ────────────────────────────────────

test.describe('Bottom Nav — PF-16 to PF-22', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/play/home')
  })

  test('PF-16: Bottom nav shows all 5 tab labels', async ({ page }) => {
    const nav = page.getByRole('tablist')
    await expect(nav.getByRole('tab', { name: /Home/i })).toBeVisible()
    await expect(nav.getByRole('tab', { name: /Scorecard/i })).toBeVisible()
    await expect(nav.getByRole('tab', { name: /Board/i })).toBeVisible()
    await expect(nav.getByRole('tab', { name: /Mulls/i })).toBeVisible()
    await expect(nav.getByRole('tab', { name: /Owe/i })).toBeVisible()
  })

  test('PF-17: Home tab navigates to /play/home', async ({ page }) => {
    // Start somewhere else first, then click Home
    await page.goto('/play/owe')
    await page.getByRole('tab', { name: /Home/i }).click()
    await expect(page).toHaveURL('/play/home')
  })

  test('PF-18: Scorecard tab navigates to /play/scorecard', async ({ page }) => {
    await page.getByRole('tab', { name: /Scorecard/i }).click()
    await expect(page).toHaveURL('/play/scorecard')
  })

  test('PF-19: Board tab navigates to /play/leaderboard', async ({ page }) => {
    await page.getByRole('tab', { name: /Board/i }).click()
    await expect(page).toHaveURL('/play/leaderboard')
  })

  test('PF-20: Mulls tab navigates to /play/mulligans', async ({ page }) => {
    await page.getByRole('tab', { name: /Mulls/i }).click()
    await expect(page).toHaveURL('/play/mulligans')
  })

  test('PF-21: Owe tab navigates to /play/owe', async ({ page }) => {
    await page.getByRole('tab', { name: /Owe/i }).click()
    await expect(page).toHaveURL('/play/owe')
  })

  test('PF-22: Active tab on current page has aria-selected=true', async ({ page }) => {
    // On /play/home, the Home tab should be selected
    const homeTab = page.getByRole('tab', { name: /Home/i })
    await expect(homeTab).toHaveAttribute('aria-selected', 'true')
    // All other tabs should NOT be selected
    await expect(page.getByRole('tab', { name: /Scorecard/i })).toHaveAttribute('aria-selected', 'false')
  })
})
