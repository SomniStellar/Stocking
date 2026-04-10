import { expect, test } from '@playwright/test'

async function openHoldingsPreview(page: import('@playwright/test').Page) {
  await page.goto('/?preview=holdings#/holdings')
  await expect(page.getByRole('heading', { name: 'Holdings' })).toBeVisible()
  await expect(page.locator('[data-item-id="portfolio-summary"]')).toBeVisible()
  await expect(page.locator('[data-item-id="holding-add-slot"]')).toBeVisible()
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
})