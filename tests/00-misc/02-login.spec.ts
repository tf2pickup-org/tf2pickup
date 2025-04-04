import { test } from '@playwright/test'

test.skip(
  () => !(process.env['STEAM_USERNAME'] && process.env['STEAM_PASSWORD']),
  'STEAM_USERNAME and STEAM_PASSWORD are required to run this test',
)

test('login', async ({ page }) => {
  const username = process.env['STEAM_USERNAME']!
  const password = process.env['STEAM_PASSWORD']!

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
    .fill(username)
  await page.locator('input[type="password"]').click()
  await page.locator('input[type="password"]').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.getByRole('button', { name: 'Sign In' }).click()
})
