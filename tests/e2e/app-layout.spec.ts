import { expect, test } from '@playwright/test'

async function openHoldingsPreview(page: import('@playwright/test').Page) {
  await page.goto('/?preview=holdings#/holdings')
  await expect(page.getByRole('heading', { name: 'Holdings' })).toBeVisible()
  await expect(page.locator('[data-item-id="portfolio-summary"]')).toBeVisible()
  await expect(page.locator('[data-item-id="holding-add-slot"]')).toBeVisible()
}

async function openDashboardPreview(page: import('@playwright/test').Page) {
  await page.goto('/?preview=dashboard#/dashboard')
  await expect(page.getByRole('heading', { name: 'Benchmark Comparison' })).toBeVisible()
}

async function openSettingsPreview(page: import('@playwright/test').Page) {
  await page.goto('/?preview=settings#/settings')
  await expect(page.getByRole('heading', { name: 'Connected Account' })).toBeVisible()
}

test.describe('Stocking app smoke', () => {
  test('login page renders the centered auth panel', async ({ page }) => {
    await page.goto('/#/login')

    await expect(page.getByRole('heading', { name: 'Sign in with Google' })).toBeVisible()
    await expect(page.getByRole('button', { name: /continue with google|preparing sign-in/i })).toBeVisible()
  })

  test('holdings preview renders the portfolio card and add slot', async ({ page }) => {
    await openHoldingsPreview(page)
    await expect(page.locator('[data-item-id="portfolio-summary"] .summary-card-title')).toHaveText('Portfolio')
  })

  test('dashboard preview renders benchmark cards and add card', async ({ page }) => {
    await openDashboardPreview(page)
    await expect(page.locator('.benchmark-portfolio-card')).toBeVisible()
    await expect(page.locator('[data-item-id="benchmark-card-SP500"]')).toBeVisible()
    await expect(page.locator('[data-item-id="benchmark-add-card"]')).toBeVisible()
  })

  test('dashboard add card opens ticker input', async ({ page }) => {
    await openDashboardPreview(page)
    await page.locator('[data-item-id="benchmark-add-card"]').click()
    await expect(page.getByPlaceholder('Ticker')).toBeVisible()
  })

  test('settings preview renders connection settings only', async ({ page }) => {
    await openSettingsPreview(page)
    await expect(page.getByRole('heading', { name: 'Sheet Data Snapshot' })).toBeVisible()
  })

  test('holdings preview desktop capture', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 960 })
    await openHoldingsPreview(page)
    await page.screenshot({ path: 'test-results/holdings-preview-desktop.png', fullPage: true })
  })

  test('holdings preview tablet capture', async ({ page }) => {
    await page.setViewportSize({ width: 834, height: 1194 })
    await openHoldingsPreview(page)
    await page.screenshot({ path: 'test-results/holdings-preview-tablet.png', fullPage: true })
  })

  test('holdings preview mobile capture', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openHoldingsPreview(page)
    await page.screenshot({ path: 'test-results/holdings-preview-mobile.png', fullPage: true })
  })

  test('dashboard preview desktop capture', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 960 })
    await openDashboardPreview(page)
    await page.screenshot({ path: 'test-results/dashboard-preview-desktop.png', fullPage: true })
  })
})
