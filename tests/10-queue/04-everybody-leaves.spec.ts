import { authUsers } from '../fixtures/auth-users'
import { minutesToMilliseconds } from 'date-fns'

authUsers('everybody leaves', async ({ steamIds, pages }) => {
  authUsers.setTimeout(minutesToMilliseconds(2))
  const queueUsers = steamIds.slice(0, 12)
  for (let i = 0; i < queueUsers.length; ++i) {
    const steamId = queueUsers[i]!
    const page = pages.get(steamId)!

    // join the queue
    await page.getByLabel(`Join queue on slot ${i}`, { exact: true }).click()
  }

  await Promise.all(
    queueUsers.slice(0, -1).map(async steamId => {
      const page = pages.get(steamId)!

      // don't ready up
      await page.getByRole('button', { name: `Can't play right now` }).click()
    }),
  )

  // last player leaves
  const page = pages.get(queueUsers[11]!)!
  await page.getByLabel(`Leave queue`, { exact: true }).click({ timeout: minutesToMilliseconds(1) })
})
