import { expect } from '@playwright/test'
import { secondsToMilliseconds } from 'date-fns'
import { authUsers } from './auth-users'
import { CaptainQueuePage } from '../pages/captain-queue.page'

interface CaptainModeFixture {
  captainQueueIsEmpty: void
}

export const captainMode = authUsers.extend<CaptainModeFixture>({
  captainQueueIsEmpty: [
    async ({ page, users }, use) => {
      // Check if captain mode is currently active
      await page.goto('/')
      const isCaptainMode = await page.locator('#captain-player-count').isVisible()

      if (!isCaptainMode) {
        // Switch to captain mode; set captainMinGames=0 so all test players are eligible captains
        const admin = users.getAdmin()
        const adminPage = await admin.adminPage()
        await adminPage.setQueueMode('captain', { captainMinGames: 0 })

        // Navigate the observer page to the new mode's queue page
        await page.goto('/')
        await expect(page.locator('#captain-player-count')).toBeVisible({
          timeout: secondsToMilliseconds(10),
        })
      }

      // Ensure queue is empty before each test
      const q = new CaptainQueuePage(page)
      await q.waitToBeEmpty({ timeout: secondsToMilliseconds(14) })

      await use()
    },
    { auto: true },
  ],
})

export { expect } from '@playwright/test'
export { mergeTests } from '@playwright/test'
