import { expect, test, type Page } from '@playwright/test'

export const login = test.extend<{ page: Page }>({
  page: async ({ page }, use) => {
    const username = process.env['STEAM_USERNAME']
    const password = process.env['STEAM_PASSWORD']
    expect(username).toBeTruthy()
    expect(password).toBeTruthy()

    await page.goto('/')
    await page.getByRole('link', { name: 'Sign in through Steam' }).click()
    await page
      .locator('form')
      .filter({ hasText: 'Sign in with account' })
      .locator('input[type="text"]')
      .click()
    await page
      .locator('form')
      .filter({ hasText: 'Sign in with account' })
      .locator('input[type="text"]')
      .fill(username!)
    await page.locator('input[type="password"]').click()
    await page.locator('input[type="password"]').fill(password!)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await page.getByRole('button', { name: 'Sign In' }).click()
    await use(page)
  },
})

export { expect } from '@playwright/test'
