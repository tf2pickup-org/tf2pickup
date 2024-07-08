import { users } from '../data'
import { launchGame, expect } from '../fixtures/launch-game'

launchGame('substitute player', async ({ pages, gameServer, gameNumber }) => {
  const admin = pages.get(users[0].steamId)!
  const slot = admin.getByLabel(`${users[1].name}'s slot`)

  await expect(slot.getByRole('link', { name: users[1].name })).toBeVisible()

  await slot.getByLabel('Request substitute').click()
  await expect(slot.getByRole('link', { name: users[1].name })).not.toBeVisible()

  await Promise.all(
    Array.from(pages.values()).map(async page => {
      await expect(
        page.getByLabel('Game events').getByText(`${users[0].name} requested substitute`),
      ).toBeVisible()
      await expect(page.getByLabel(`${users[1].name}'s slot`).getByRole('button')).not.toBeVisible()
    }),
  )
})
