import { authUsers, expect } from '../fixtures/auth-users'
import { minutesToMilliseconds } from 'date-fns'

authUsers('player is late for ready up', async ({ steamIds, pages, page }) => {
  authUsers.setTimeout(minutesToMilliseconds(2))
  const queueUsers = steamIds.slice(0, 12)
  for (let i = 0; i < queueUsers.length; ++i) {
    const steamId = queueUsers[i]!
    const page = pages.get(steamId)!

    // join the queue
    await page.getByLabel(`Join queue on slot ${i}`, { exact: true }).click()
  }

  const readyUsers = queueUsers.slice(1, -1)
  await Promise.all(
    readyUsers.map(async user => {
      const page = pages.get(user)!

      // ready up
      await page.getByRole('button', { name: `I'M READY` }).click()
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
      const page = pages.get(steamId)!
      await page
        .getByLabel(`Leave queue`, { exact: true })
        .click({ timeout: minutesToMilliseconds(1) })
    }),
  )
})
