import { authUsers, expect } from '../fixtures/auth-users'
import { minutesToMilliseconds } from 'date-fns'

authUsers('player is late for ready up', async ({ steamIds, users, page }) => {
  authUsers.setTimeout(minutesToMilliseconds(2))
  const queueUsers = steamIds.slice(0, 12)
  queueUsers
    .map(steamId => users.bySteamId(steamId).queuePage())
    .forEach(async (page, i) => {
      await page.joinQueue(i)
    })

  const readyUsers = queueUsers.slice(1)
  await Promise.all(
    readyUsers
      .map(steamId => users.bySteamId(steamId).queuePage())
      .map(async page => {
        await page.readyUpDialog().readyUp()
      }),
  )

  // player gets kicked
  await expect(page.getByRole('heading', { name: /^Players:/ })).toHaveText('Players: 11/12', {
    timeout: 60000,
  })
  const kickedUserPage = users.bySteamId(queueUsers[0]!).page
  await expect(kickedUserPage.getByLabel(`Join queue on slot 0`, { exact: true })).toBeVisible()

  // everybody leaves the queue
  await Promise.all(
    readyUsers
      .map(steamId => users.bySteamId(steamId).queuePage())
      .map(async page => {
        await page.leaveQueue(minutesToMilliseconds(1))
      }),
  )
})
