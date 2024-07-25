import { authUsers } from '../fixtures/auth-users'

authUsers('everybody leaves', async ({ steamIds, pages }) => {
  const queueUsers = steamIds.slice(0, 12)
  await Promise.all(
    queueUsers.map(async (steamId, i) => {
      const page = pages.get(steamId)!

      // join the queue
      await page.getByLabel(`Join queue on slot ${i}`, { exact: true }).click()

      // wait for ready-up
      await page.getByRole('button', { name: `Can't play right now` }).click()
    }),
  )
})
