import { test } from '@playwright/test'
import { expect } from '../fixtures/expect'
import { users } from '../data'

const newcomer = users.find(({ name }) => name === 'Newcomer')!

test('accept rules @6v6 @9v9', async ({ page }) => {
  const errors: Error[] = []
  page.on('pageerror', error => errors.push(error))
  await page.addInitScript(() => {
    Object.defineProperty(Notification, 'permission', { get: () => 'default' })
  })
  await page.goto(`/auth/test?steamId=${newcomer.steamId}&acceptedRules=false`)
  await expect(page.getByTitle('Accept rules dialog')).toBeVisible()
  const banner = page.locator('#notifications-permission-default')
  await expect(banner).toBeVisible()
  const originalBanner = await banner.elementHandle()
  const queueUrl = page.url()

  const btn = page.getByRole('button', { name: 'I accept these rules' })
  await expect(btn).toBeVisible()
  await btn.click()

  await expect(page.getByTitle('Accept rules dialog')).not.toBeVisible()
  await expect(banner).toBeVisible()
  expect(await originalBanner!.evaluate(element => element.isConnected)).toBe(true)
  expect(page.url()).toBe(queueUrl)
  expect(await page.evaluate(() => Notification.permission)).toBe('default')
  await page.reload()
  await expect(page.getByTitle('Accept rules dialog')).not.toBeVisible()
  expect(errors).toEqual([])
})
