import { authUsers, expect } from '../fixtures/auth-users'
import { users, type User } from '../data'

interface QueueUser extends User {
  slotId: number
}

const queueUsers: QueueUser[] = users.map((user, i) => ({ ...user, slotId: i }))

authUsers(...queueUsers.map(u => u.steamId))('launch game', async ({ pages, page }) => {
  // no players are in the queue
  await expect(page.getByRole('heading', { name: /^Players:/ })).toHaveText('Players: 0/12')

  await Promise.all(
    queueUsers.map(async user => {
      const page = pages.get(user.steamId)!

      // join the queue
      await page.getByLabel(`Join queue on slot ${user.slotId}`, { exact: true }).click()

      // wait for ready-up
      await page.getByRole('button', { name: `I'M READY` }).click()
      await page.waitForURL(/games\/(\d+)/)

      await page.goto('/')
      await expect(page.getByRole('link', { name: 'Go back to the game' })).toBeVisible()
    }),
  )
})
