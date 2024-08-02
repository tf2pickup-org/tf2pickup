import { authUsers } from '../fixtures/auth-users'
import { minutesToMilliseconds } from 'date-fns'
import { QueuePage } from '../pages/queue.page'

authUsers('everybody leaves', async ({ steamIds, pages }) => {
  authUsers.setTimeout(minutesToMilliseconds(2))
  const queueUsers = steamIds.slice(0, 12)
  for (let i = 0; i < queueUsers.length; ++i) {
    const steamId = queueUsers[i]!
    const page = new QueuePage(pages.get(steamId)!)
    await page.joinQueue(i)
  }

  await Promise.all(
    queueUsers.slice(0, -1).map(async steamId => {
      const page = new QueuePage(pages.get(steamId)!)
      await page.readyUpDialog().notReady()
    }),
  )

  // last player leaves
  const page = new QueuePage(pages.get(queueUsers[11]!)!)
  await page.leaveQueue(minutesToMilliseconds(1))
})
