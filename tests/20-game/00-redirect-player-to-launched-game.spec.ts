import { secondsToMilliseconds } from 'date-fns'
import { expect, launchGame as test } from '../fixtures/launch-game'
import { QueuePage } from '../pages/queue.page'

test('redirect player to launched game @6v6 @9v9', async ({
  users,
  players,
  desiredSlots,
  gameServer,
}) => {
  // this spec launches its own game rather than using the gameNumber fixture, so it has to make
  // the game server available itself
  await gameServer.sendHeartbeat()

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
      await queuePage.readyUp(desiredSlots.get(player.playerName)!)
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
  await expect(redirectedQueuePage.goBackToGameLink()).toBeVisible()

  // kill the game and free the game server, as the gameNumber fixture does
  const gamePage = await users.getAdmin().gamePage(gameNumber)
  await gamePage.goto()
  await gamePage.forceEnd()
  await expect
    .poll(() => gameServer.logAddresses.size === 0, {
      message: 'make sure logaddress is cleared',
      timeout: secondsToMilliseconds(40),
    })
    .toBe(true)
  await (await users.getAdmin().adminPage()).freeStaticGameServer()
})
