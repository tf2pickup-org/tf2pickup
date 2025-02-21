import { expect, launchGame } from '../fixtures/launch-game'

launchGame(
  'queue is locked for players that are involved in active game',
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async ({ players, gameNumber }) => {
    await Promise.all(
      players.map(async player => {
        const page = await player.queuePage()
        await page.goto()
        for (let i = 0; i < 12; ++i) {
          await expect(page.slot(i).joinButton()).toBeDisabled()
        }
      }),
    )
  },
)
