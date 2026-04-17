import { test, expect } from '@playwright/test'

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
  })

  test('dashboard preview renders benchmark cards and add trigger', async ({ page }) => {
    await openDashboardPreview(page)

    await expect(page.getByText('S&P 500')).toBeVisible()
    await expect(page.getByText('Nasdaq 100')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Add benchmark' })).toBeVisible()
  })

  test('dashboard add trigger opens ticker input', async ({ page }) => {
    await openDashboardPreview(page)

    await page.getByRole('button', { name: 'Add benchmark' }).click()
    await expect(page.getByPlaceholder('Ticker')).toBeVisible()
  })

  test('settings preview renders connection settings only', async ({ page }) => {
    await openSettingsPreview(page)

    await expect(page.getByRole('heading', { name: 'Connected Account' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Create Template Spreadsheet' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Sheet Data Snapshot' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Benchmark Comparison' })).toHaveCount(0)
  })

  test('holdings preview desktop capture', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 960 })
    await openHoldingsPreview(page)
    await page.screenshot({ path: 'test-results/holdings-preview-desktop.png', fullPage: true })
  })

  test('holdings preview tablet capture', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 1100 })
    await openHoldingsPreview(page)
    await page.screenshot({ path: 'test-results/holdings-preview-tablet.png', fullPage: true })
  })

  test('holdings preview mobile capture', async ({ page }) => {
    await page.setViewportSize({ width: 430, height: 932 })
    await openHoldingsPreview(page)
    await page.screenshot({ path: 'test-results/holdings-preview-mobile.png', fullPage: true })
  })

  test('dashboard preview desktop capture', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 960 })
    await openDashboardPreview(page)
    await page.screenshot({ path: 'test-results/dashboard-preview-desktop.png', fullPage: true })
  })

  test('holdings preview fhd capture', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await openHoldingsPreview(page)
    await page.screenshot({ path: 'test-results/holdings-preview-fhd.png', fullPage: true })
  })

  test('dashboard preview fhd capture', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await openDashboardPreview(page)
    await page.screenshot({ path: 'test-results/dashboard-preview-fhd.png', fullPage: true })
  })
})
