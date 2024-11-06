import { secondsToMilliseconds } from 'date-fns'
import { expect, launchGame } from '../fixtures/launch-game'

launchGame(
  'update player connection status',
  async ({ steamIds, gameNumber, users, gameServer }) => {
    const players = steamIds.slice(0, 12)

    await Promise.all(
      players
        .map(steamId => users.bySteamId(steamId))
        .map(user => ({ page: user.gamePage(gameNumber), playerName: user.playerName }))
        .map(async ({ page, playerName }) => {
          await expect(page.gameEvent('Game server initialized')).toBeVisible({
            timeout: secondsToMilliseconds(30),
          })

          const slot = page.playerSlot(playerName)
          await expect(slot.getByLabel('Player connection status')).toHaveClass(/offline/)

          await gameServer.playerConnects(playerName)
          await expect(slot.getByLabel('Player connection status')).toHaveClass(/joining/)

          await gameServer.playerJoinsTeam(playerName)
          await expect(slot.getByLabel('Player connection status')).toHaveClass(/connected/)

          await gameServer.playerDisconnects(playerName)
          await expect(slot.getByLabel('Player connection status')).toHaveClass(/offline/)
        }),
    )
  },
)
