import { launchGame as test } from '../fixtures/launch-game'
import { queueSlots } from '../queue-slots'
import { expect } from '../fixtures/expect'

test('queue is locked for players that are involved in active game @6v6 @9v9', async ({
  players,
  gameNumber,
}) => {
  await Promise.all(
    players.map(async player => {
      const page = await player.queuePage()
      await page.goto()
      await expect(page.goBackToGameLink()).toHaveAttribute('href', `/games/${gameNumber}`)
      for (const slot of queueSlots()) {
        await expect(page.slot(slot).joinButton()).toBeDisabled()
      }
    }),
  )
})
