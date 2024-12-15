import { mergeTests } from '@playwright/test'
import { authUsers } from '../fixtures/auth-users'
import { minutesToMilliseconds } from 'date-fns'
import { waitForEmptyQueue } from '../fixtures/wait-for-empty-queue'

const test = mergeTests(authUsers, waitForEmptyQueue)

test('everybody leaves', async ({ steamIds, users }) => {
  authUsers.setTimeout(minutesToMilliseconds(2))
  const queueUsers = steamIds.slice(0, 12)
  for (let i = 0; i < queueUsers.length; ++i) {
    const steamId = queueUsers[i]!
    const page = await users.bySteamId(steamId).queuePage()
    await page.goto()
    await page.joinQueue(i)
  }

  await Promise.all(
    queueUsers.slice(0, -1).map(async steamId => {
      const page = await users.bySteamId(steamId).queuePage()
      await page.readyUpDialog().notReady()
    }),
  )

  // last player leaves
  const page = await users.bySteamId(queueUsers[11]!).queuePage()
  await page.leaveQueue(minutesToMilliseconds(1.5))
})
