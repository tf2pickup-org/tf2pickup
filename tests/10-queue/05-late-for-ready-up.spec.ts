import { mergeTests } from '@playwright/test'
import { authUsers, expect } from '../fixtures/auth-users'
import { minutesToMilliseconds } from 'date-fns'
import { waitForEmptyQueue } from '../fixtures/wait-for-empty-queue'
import { queueSlots } from '../queue-slots'

const test = mergeTests(authUsers, waitForEmptyQueue)

test('player is late for ready up', async ({ steamIds, users, page }) => {
  authUsers.setTimeout(minutesToMilliseconds(2))
  const queueUsers = steamIds.slice(0, 12)
  const slots = [...queueSlots()]
  await Promise.all(
    queueUsers.map(async (steamId, i) => {
      const page = await users.bySteamId(steamId).queuePage()
      await page.goto()
      await page.joinQueue(slots[i]!)
    }),
  )

  const readyUsers = queueUsers.slice(1)
  await Promise.all(
    readyUsers.map(async steamId => {
      const page = await users.bySteamId(steamId).queuePage()
      await page.readyUpDialog().readyUp()
    }),
  )

  // player gets kicked
  await expect(page.getByRole('heading', { name: /^Players:/ })).toHaveText('Players: 11/12', {
    timeout: 60000,
  })
  const kickedUserPage = await users.bySteamId(queueUsers[0]!).queuePage()
  await expect(kickedUserPage.slot('scout-1').joinButton()).toBeVisible()

  // everybody leaves the queue
  await Promise.all(
    readyUsers.map(async steamId => {
      const page = await users.bySteamId(steamId).queuePage()
      await page.leaveQueue(minutesToMilliseconds(1))
    }),
  )
})
