import { secondsToMilliseconds } from 'date-fns'
import { expect, launchGame } from '../fixtures/launch-game'

launchGame('update player connection status', async ({ players, gameNumber, gameServer }) => {
  await Promise.all(
    players.map(async player => {
      const page = await player.gamePage(gameNumber)
      await expect(page.gameEvent('Game server initialized')).toBeVisible({
        timeout: secondsToMilliseconds(30),
      })

      const slot = page.playerSlot(player.playerName)
      await expect(slot.getByLabel('Player connection status')).toHaveClass(/offline/)

      await gameServer.playerConnects(player.playerName)
      await expect(slot.getByLabel('Player connection status')).toHaveClass(/joining/)

      await gameServer.playerJoinsTeam(player.playerName)
      await expect(slot.getByLabel('Player connection status')).toHaveClass(/connected/)

      await gameServer.playerDisconnects(player.playerName)
      await expect(slot.getByLabel('Player connection status')).toHaveClass(/offline/)
    }),
  )
})
