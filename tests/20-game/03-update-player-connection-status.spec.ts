import { expect, launchGame } from '../fixtures/launch-game'

launchGame.use({ waitForStage: 'launching', killGame: false })
launchGame(
  'update player connection status @6v6 @9v9',
  async ({ players, gameNumber, gameServer }) => {
    await Promise.all(
      players.map(async player => {
        const page = await player.gamePage(gameNumber)
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
  },
)
