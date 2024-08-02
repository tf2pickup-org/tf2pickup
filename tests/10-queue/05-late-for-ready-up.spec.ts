import { authUsers, expect } from '../fixtures/auth-users'
import { minutesToMilliseconds } from 'date-fns'
import { QueuePage } from '../pages/queue.page'

authUsers('player is late for ready up', async ({ steamIds, pages, page }) => {
  authUsers.setTimeout(minutesToMilliseconds(2))
  const queueUsers = steamIds.slice(0, 12)
  for (let i = 0; i < queueUsers.length; ++i) {
    const steamId = queueUsers[i]!
    const page = new QueuePage(pages.get(steamId)!)
    await page.joinQueue(i)
  }

  const readyUsers = queueUsers.slice(1, -1)
  await Promise.all(
    readyUsers.map(async user => {
      const page = new QueuePage(pages.get(user)!)

      // ready up
      await page.readyUpDialog().readyUp()
    }),
  )

  // player gets kicked
  await expect(page.getByRole('heading', { name: /^Players:/ })).toHaveText('Players: 11/12', {
    timeout: 60000,
  })
  await expect(
    pages.get(queueUsers[0]!)!.getByLabel(`Join queue on slot 0`, { exact: true }),
  ).toBeVisible()

  // everybody leaves the queue
  await Promise.all(
    queueUsers.slice(1).map(async steamId => {
      const page = new QueuePage(pages.get(steamId)!)
      await page.leaveQueue(minutesToMilliseconds(1))
    }),
  )
})
