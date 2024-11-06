import { expect, launchGame } from '../fixtures/launch-game'

launchGame(
  'queue is locked for players that are involved in active game',
  async ({ steamIds, users }) => {
    const queueUsers = steamIds.slice(0, 12)

    await Promise.all(
      queueUsers
        .map(steamId => users.bySteamId(steamId).queuePage())
        .map(async page => {
          await page.goto()
          for (let i = 0; i < 12; ++i) {
            await expect(page.slot(i).joinButton()).toBeDisabled()
          }
        }),
    )
  },
)
