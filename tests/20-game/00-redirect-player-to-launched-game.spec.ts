import { launchGame as test } from '../fixtures/launch-game'

test('redirect player to launched game', async ({ users, players, desiredSlots }) => {
  await Promise.all(
    players.map(async player => {
      const queuePage = await player.queuePage()
      await queuePage.goto()
      const slot = desiredSlots.get(player.playerName)!
      await queuePage.slot(slot).join()
      await queuePage.readyUpDialog().readyUp()
    }),
  )

  await Promise.all(
    players.map(async player => {
      const page = await player.page()
      await page.waitForURL(/games\/(\d+)/)
    }),
  )

  // kill the game
  const page = await users.byName('Promenader').page()
  const matches = page.url().match(/games\/(\d+)/)
  if (!matches) {
    throw new Error('could not launch game')
  }

  const gameNumber = Number(matches[1])
  const gamePage = await users.getAdmin().gamePage(gameNumber)
  await gamePage.goto()
  await gamePage.forceEnd()
})
