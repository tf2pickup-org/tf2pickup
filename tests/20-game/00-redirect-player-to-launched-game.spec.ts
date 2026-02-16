import { launchGame as test } from '../fixtures/launch-game'

test('redirect player to launched game @6v6 @9v9', async ({ users, players, desiredSlots }) => {
  const batchSize = 6
  for (let i = 0; i < players.length; i += batchSize) {
    const batch = players.slice(i, i + batchSize)
    await Promise.all(
      batch.map(async player => {
        const queuePage = await player.queuePage()
        await queuePage.goto()
        const slot = desiredSlots.get(player.playerName)!
        await queuePage.slot(slot).join()
      }),
    )
  }

  await Promise.all(
    players.map(async player => {
      const queuePage = await player.queuePage()
      await queuePage.readyUpDialog().readyUp()
      await (await player.page()).waitForURL(/games\/(\d+)/)
    }),
  )

  // kill the game
  const page = await users.byName('Promenader').page()
  const matches = /games\/(\d+)/.exec(page.url())
  if (!matches) {
    throw new Error('could not launch game')
  }

  const gameNumber = Number(matches[1])
  const gamePage = await users.getAdmin().gamePage(gameNumber)
  await gamePage.goto()
  await gamePage.forceEnd()
})
