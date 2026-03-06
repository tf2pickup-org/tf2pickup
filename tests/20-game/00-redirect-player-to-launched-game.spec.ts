import { launchGame as test } from '../fixtures/launch-game'
import { QueuePage } from '../pages/queue.page'

test('redirect player to launched game @6v6 @9v9', async ({ users, players, desiredSlots }) => {
  let redirectedQueuePage: QueuePage | undefined

  const batchSize = 6
  for (let i = 0; i < players.length; i += batchSize) {
    const batch = players.slice(i, i + batchSize)
    await Promise.all(
      batch.map(async (player, batchIndex) => {
        const queuePage = await player.queuePage()
        await queuePage.goto()
        const slot = desiredSlots.get(player.playerName)!
        await queuePage.slot(slot).join()
        if (i === 0 && batchIndex === 0) {
          redirectedQueuePage = queuePage
        }
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

  if (!redirectedQueuePage) {
    throw new Error('expected at least one redirected player page')
  }

  const matches = /games\/(\d+)/.exec(redirectedQueuePage.page.url())
  if (!matches) {
    throw new Error('could not launch game')
  }

  const gameNumber = Number(matches[1])

  await redirectedQueuePage.page.goBack()
  await redirectedQueuePage.page.waitForURL('/')
  await test.expect(redirectedQueuePage.goBackToGameLink()).toBeVisible()

  // kill the game
  const gamePage = await users.getAdmin().gamePage(gameNumber)
  await gamePage.goto()
  await gamePage.forceEnd()
})
