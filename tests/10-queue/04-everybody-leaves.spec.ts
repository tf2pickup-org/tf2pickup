import { users, type User } from '../data'
import { authUsers } from '../fixtures/auth-users'

interface QueueUser extends User {
  slotId: number
}

const queueUsers: QueueUser[] = users.map((user, i) => ({ ...user, slotId: i }))

authUsers(...queueUsers.map(u => u.steamId))('everybody leaves', async ({ pages, page }) => {
  await Promise.all(
    queueUsers.map(async user => {
      const page = pages.get(user.steamId)!

      // join the queue
      await page.getByLabel(`Join queue on slot ${user.slotId}`, { exact: true }).click()

      // wait for ready-up
      await page.getByRole('button', { name: `Can't play right now` }).click()
    }),
  )
})
