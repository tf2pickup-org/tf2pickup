import { secondsToMilliseconds } from 'date-fns'
import { expect, authUsers as test } from '../fixtures/auth-users'
import { delay } from 'es-toolkit'

test('tracks online players', async ({ page, users }) => {
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'Blacklight' })).not.toBeVisible()

  const blacklight = users.byName('Blacklight')
  const queuePage = await blacklight.queuePage()
  await queuePage.goto()
  await expect(page.getByRole('link', { name: 'Blacklight' })).toBeVisible()

  // players disconnects
  await queuePage.page.close()
  await expect(page.getByRole('link', { name: 'Blacklight' })).not.toBeVisible({
    timeout: secondsToMilliseconds(14),
  })
})

test.describe('when user opens a new tab and then closes it', () => {
  test('should keep them online', async ({ page, users }) => {
    await page.goto('/')
    const blacklight = users.byName('Blacklight')

    const queuePage = await blacklight.queuePage()
    await queuePage.goto()
    await queuePage.page.getByRole('link', { name: 'Games' }).click({ button: 'middle' })
    await delay(secondsToMilliseconds(1))

    // player closes the second tab - should remain online
    const anotherPage = blacklight.browserContext.pages()[1]
    expect(anotherPage).toBeTruthy()
    await anotherPage!.close()
    await expect(page.getByRole('link', { name: 'Blacklight' })).toBeVisible()
    await delay(secondsToMilliseconds(15))
    await expect(page.getByRole('link', { name: 'Blacklight' })).toBeVisible()

    // players closes the first tab - should go offline after 10 seconds
    await queuePage.page.close()
    await expect(page.getByRole('link', { name: 'Blacklight' })).not.toBeVisible({
      timeout: secondsToMilliseconds(14),
    })
  })
})
