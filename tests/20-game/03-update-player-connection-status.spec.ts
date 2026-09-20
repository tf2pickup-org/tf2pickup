import { expect, launchGame } from '../fixtures/launch-game'
import { secondsToMilliseconds } from 'date-fns'

launchGame.use({ waitForStage: 'launching' })
launchGame(
  'update player connection status @6v6 @9v9',
  async ({ players, gameNumber, gameServer }) => {
    const batchSize = 3
    for (let i = 0; i < players.length; i += batchSize) {
      await Promise.all(
        players.slice(i, i + batchSize).map(async player => {
          const page = await player.gamePage(gameNumber)
          const slot = page.playerSlot(player.playerName)
          await expect(slot.getByLabel('Player connection status')).toHaveClass(/offline/)

          await gameServer.playerConnects(player.playerName)
          await expect(slot.getByLabel('Player connection status')).toHaveClass(/joining/, {
            timeout: secondsToMilliseconds(15),
          })

          await gameServer.playerJoinsTeam(player.playerName)
          await expect(slot.getByLabel('Player connection status')).toHaveClass(/connected/, {
            timeout: secondsToMilliseconds(15),
          })

          await gameServer.playerDisconnects(player.playerName)
          await expect(slot.getByLabel('Player connection status')).toHaveClass(/offline/, {
            timeout: secondsToMilliseconds(15),
          })
        }),
      )
    }
  },
)
