import { test } from '@playwright/test'
import { expect } from '../fixtures/expect'
import { users } from '../data'

const newcomer = users.find(({ name }) => name === 'Newcomer')!

test('accept rules @6v6 @9v9', async ({ page }) => {
  await page.goto(`/auth/test?steamId=${newcomer.steamId}`)
  await expect(page.getByTitle('Accept rules dialog')).toBeVisible()

  const btn = page.getByRole('button', { name: 'I accept these rules' })
  await expect(btn).toBeVisible()
  await btn.click()

  await expect(page.getByTitle('Accept rules dialog')).not.toBeVisible()
})
