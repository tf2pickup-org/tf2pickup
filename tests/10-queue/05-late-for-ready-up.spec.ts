import { authUsers, expect } from '../fixtures/auth-users'
import { minutesToMilliseconds } from 'date-fns'

authUsers('player is late for ready up', async ({ steamIds, users, page }) => {
  authUsers.setTimeout(minutesToMilliseconds(2))
  const queueUsers = steamIds.slice(0, 12)
  await Promise.all(
    queueUsers.map(async (steamId, i) => {
      const page = await users.bySteamId(steamId).queuePage()
      await page.goto()
      await page.joinQueue(i)
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
  const kickedUserPage = await users.bySteamId(queueUsers[0]!).page()
  await expect(kickedUserPage.getByLabel(`Join queue on slot 0`, { exact: true })).toBeVisible()

  // everybody leaves the queue
  await Promise.all(
    readyUsers.map(async steamId => {
      const page = await users.bySteamId(steamId).queuePage()
      await page.leaveQueue(minutesToMilliseconds(1))
    }),
  )
})
