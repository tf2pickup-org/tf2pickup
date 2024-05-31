import { expect } from '@playwright/test'
import { login as test } from './fixtures/login'

test('joins queue', async ({ page }) => {
  await page.getByLabel(`Join queue on slot 1`, { exact: true }).click()
  await expect(page.getByLabel(`Leave queue`, { exact: true })).toBeVisible()
  await page.getByLabel(`Leave queue`, { exact: true }).click()
  await expect(page.getByLabel(`Leave queue`, { exact: true })).not.toBeVisible()
})
