import { devices } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { authUsers as test } from '../fixtures/auth-users'
import { expect } from '../fixtures/expect'

for (const device of ['iPhone SE', 'iPhone 15'] as const) {
  test(`shows chat and online players on ${device} @6v6 @9v9`, async ({ browser, users }) => {
    const user = users.getFirst()
    await user.page()
    const context = await browser.newContext({
      ...devices[device],
      storageState: await user.browserContext.storageState(),
    })

    try {
      const page = await context.newPage()
      await page.goto('/')
      await page.getByRole('button', { name: 'Chat' }).tap()

      const messageList = page.locator('#chat-message-list')
      const input = page.getByPlaceholder('Send message...')
      await expect(messageList).toBeInViewport()

      // Alerts above the tabs can put the composer below the fold on short screens.
      await input.scrollIntoViewIfNeeded()
      await expect(input).toBeInViewport()

      const message = `Mobile chat ${randomUUID()}`
      await input.fill(message)
      await page.getByRole('button', { name: 'Send message' }).tap()
      await expect(messageList.getByText(message)).toBeInViewport()

      await page.getByRole('button', { name: /Online/ }).tap()
      const onlinePlayers = page.locator('#online-player-list')
      await expect(onlinePlayers.getByRole('link').first()).toBeInViewport()
    } finally {
      await context.close()
    }
  })
}
