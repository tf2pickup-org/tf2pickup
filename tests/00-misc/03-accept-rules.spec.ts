import { test } from '@playwright/test'
import { expect } from '../fixtures/expect'
import { users } from '../data'

const newcomer = users.find(({ name }) => name === 'Newcomer')!

test('accept rules @6v6 @9v9', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 600 })
  const errors: Error[] = []
  page.on('pageerror', error => errors.push(error))
  await page.addInitScript(() => {
    Object.defineProperty(Notification, 'permission', { get: () => 'default' })
  })
  await page.goto(`/auth/test?steamId=${newcomer.steamId}&acceptedRules=false`)
  const dialog = page.getByTitle('Accept rules dialog')
  await expect(dialog).toBeVisible()
  const rules = dialog.locator('.rules-wrapper')
  await expect(dialog).toHaveJSProperty('scrollTop', 0)
  await expect(rules).toBeFocused()
  await expect(rules).toHaveJSProperty('scrollTop', 0)
  const banner = page.locator('#notifications-permission-default')
  await expect(banner).toBeVisible()
  const originalBanner = await banner.elementHandle()
  const queueUrl = page.url()

  const btn = page.getByRole('button', { name: 'I accept these rules' })
  await expect(btn).toBeVisible()
  await btn.click()

  await expect(dialog).not.toBeVisible()
  await expect(banner).toBeVisible()
  expect(await originalBanner.evaluate(element => element.isConnected)).toBe(true)
  expect(page.url()).toBe(queueUrl)
  expect(await page.evaluate(() => Notification.permission)).toBe('default')
  await expect(page.getByRole('button', { name: /Join queue on slot/ }).first()).toBeEnabled()
  await page.reload()
  await expect(dialog).not.toBeVisible()
  expect(errors).toEqual([])
})
