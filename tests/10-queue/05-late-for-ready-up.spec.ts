import { authUsers, expect } from '../fixtures/auth-users'

authUsers('player is late for ready up', async ({ steamIds, pages, page }) => {
  const queueUsers = steamIds.slice(0, 12)
  await Promise.all(
    queueUsers.map(async (steamId, i) => {
      const page = pages.get(steamId)!

      // join the queue
      await page.getByLabel(`Join queue on slot ${i}`, { exact: true }).click()
    }),
  )

  const readyUsers = queueUsers.slice(0, -1)
  await Promise.all(
    readyUsers.map(async user => {
      const page = pages.get(user)!

      // ready up
      await page.getByRole('button', { name: `I'M READY` }).click()
    }),
  )

  await expect(page.getByRole('heading', { name: /^Players:/ })).toHaveText('Players: 11/12', {
    timeout: 60000,
  })

  // player gets kicked
  await expect(
    pages.get(queueUsers[11]!)!.getByLabel(`Join queue on slot 11`, { exact: true }),
  ).toBeVisible()
})
