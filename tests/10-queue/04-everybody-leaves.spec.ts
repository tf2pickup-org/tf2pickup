import { authUsers } from '../fixtures/auth-users'
import { minutesToMilliseconds } from 'date-fns'

authUsers('everybody leaves', async ({ steamIds, users }) => {
  authUsers.setTimeout(minutesToMilliseconds(2))
  const queueUsers = steamIds.slice(0, 12)
  for (let i = 0; i < queueUsers.length; ++i) {
    const steamId = queueUsers[i]!
    const page = users.bySteamId(steamId).queuePage()
    await page.joinQueue(i)
  }

  await Promise.all(
    queueUsers
      .slice(0, -1)
      .map(steamId => users.bySteamId(steamId).queuePage())
      .map(async page => {
        await page.readyUpDialog().notReady()
      }),
  )

  // last player leaves
  const page = users.bySteamId(queueUsers[11]!).queuePage()
  await page.leaveQueue(minutesToMilliseconds(1.5))
})
