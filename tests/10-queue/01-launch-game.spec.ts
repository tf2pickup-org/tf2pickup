import { authUsers, expect } from '../fixtures/auth-users'
import { users, type User } from '../data'

interface QueueUser extends User {
  slotId: number
}

const queueUsers: QueueUser[] = users.map((user, i) => ({ ...user, slotId: i }))

let gameNo: number

authUsers(...queueUsers.map(u => u.steamId))('launch game', async ({ pages, page }) => {
  // no players are in the queue
  await expect(page.getByRole('heading', { name: /^Players:/ })).toHaveText('Players: 0/12')

  await Promise.all(
    queueUsers.map(async user => {
      const page = pages.get(user.steamId)!

      // join the queue
      await page.getByLabel(`Join queue on slot ${user.slotId}`, { exact: true }).click()

      // wait for ready-up
      await page.getByRole('button', { name: `I'M READY` }).click()
      await page.waitForURL(/games\/(\d+)/)
      const matches = page.url().match(/games\/(\d+)/)
      if (matches) {
        gameNo = Number(matches[1])
      }
      expect(gameNo).toBeTruthy()

      const slot = page.getByRole('link', { name: user.name })
      await expect(slot).toBeVisible()
      expect(await slot.getAttribute('href')).toMatch(`/players/${user.steamId}`)

      await page.goto('/')
      const goBackLink = page.getByRole('link', { name: 'Go back to the game' })
      await expect(goBackLink).toBeVisible()
      await goBackLink.click()

      await page.waitForURL(/games\/(\d+)/)
      const gameState = page.getByLabel('Game status')
      await expect(gameState).toBeVisible()
      await expect(gameState).toContainText('live', { ignoreCase: true })
    }),
  )
})
