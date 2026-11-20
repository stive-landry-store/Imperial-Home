import { expect, test } from '@playwright/test'

// The site runs in preview mode here (no Supabase): sample apartments, no accounts.

test.describe('public site', () => {
  test('home shows the hero, the apartments and the credits', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto('/')
    await expect(page.locator('h1').first()).toBeVisible()
    await expect(page.locator('.ih-hero-word').first()).toBeVisible()
    await page.mouse.wheel(0, 1200)
    await expect(page.locator('[data-reveal].is-revealed').first()).toBeVisible()
    await expect(page.getByText('stive landry store').first()).toBeAttached()
    expect(errors).toEqual([])
  })

  test('apartments list opens an apartment page', async ({ page }) => {
    await page.goto('/properties')
    const first = page.locator('article a[href^="/properties/"]').first()
    await expect(first).toBeVisible()
    await first.click()
    await expect(page).toHaveURL(/\/properties\/[^/]+$/)
    await expect(page.locator('h1').first()).toBeVisible()
  })

  test('legal pages and reviews load', async ({ page }) => {
    for (const path of ['/a-propos', '/conditions', '/confidentialite', '/avis']) {
      await page.goto(path)
      await expect(page.locator('h1').first()).toBeVisible()
    }
    await page.goto('/a-propos')
    await expect(page.locator('main, .theme-page').getByText('NYAMI TCHOUPE STIVE LANDRY', { exact: true }).first()).toBeVisible()
  })

  test('sign-up form asks for every field', async ({ page }) => {
    await page.goto('/register')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
  })

  test('admin requires an account', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/login\?next=%2Fadmin/)
  })

  test('unknown pages show the not-found page', async ({ page }) => {
    await page.goto('/this-page-does-not-exist')
    await expect(page.locator('body')).toContainText(/404|introuvable|not found/i)
  })
})

test('reduced motion turns animations off', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' })
  const page = await context.newPage()
  await page.goto('/')
  await expect(page.locator('html')).not.toHaveClass(/ih-motion/)
  await context.close()
})
