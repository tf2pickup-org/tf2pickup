import { expect, launchGame } from '../fixtures/launch-game'
import { queueSlots } from '../queue-slots'

launchGame(
  'queue is locked for players that are involved in active game',
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async ({ players, gameNumber }) => {
    await Promise.all(
      players.map(async player => {
        const page = await player.queuePage()
        await page.goto()
        for (const slot of queueSlots()) {
          await expect(page.slot(slot).joinButton()).toBeDisabled()
        }
      }),
    )
  },
)
