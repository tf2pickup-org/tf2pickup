import { users, type User } from '../data'
import { authUsers, expect } from '../fixtures/auth-users'

interface QueueUser extends User {
  slotId: number
}

const queueUsers: QueueUser[] = users.map((user, i) => ({ ...user, slotId: i }))

authUsers(...queueUsers.map(u => u.steamId))(
  'player is late for ready up',
  async ({ pages, page }) => {
    await Promise.all(
      queueUsers.map(async user => {
        const page = pages.get(user.steamId)!

        // join the queue
        await page.getByLabel(`Join queue on slot ${user.slotId}`, { exact: true }).click()
      }),
    )

    const readyUsers = queueUsers.slice(0, -1)
    await Promise.all(
      readyUsers.map(async user => {
        const page = pages.get(user.steamId)!

        // ready up
        await page.getByRole('button', { name: `I'M READY` }).click()
      }),
    )

    await expect(page.getByRole('heading', { name: /^Players:/ })).toHaveText('Players: 11/12', {
      timeout: 60000,
    })

    // player gets kicked
    await expect(
      pages.get(queueUsers[11]!.steamId).getByLabel(`Join queue on slot 11`, { exact: true }),
    ).toBeVisible()
  },
)
