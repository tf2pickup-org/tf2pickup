import { secondsToMilliseconds } from 'date-fns'
import { expect, launchGame } from '../fixtures/launch-game'
import { GamePage } from '../pages/game.page'
import { users } from '../data'

launchGame(
  'update player connection status',
  async ({ steamIds, gameNumber, pages, gameServer }) => {
    const players = steamIds.slice(0, 12)

    await Promise.all(
      players.map(async steamId => {
        const page = new GamePage(pages.get(steamId)!, gameNumber)
        const playerName = users.find(u => u.steamId === steamId)!.name

        await expect(page.gameEvent('Game server initialized')).toBeVisible({
          timeout: secondsToMilliseconds(30),
        })

        const slot = page.playerSlot(playerName)

        await gameServer.playerConnects(playerName)
        await expect(slot.getByLabel('Player connection status')).toHaveClass(/joining/)

        await gameServer.playerJoinsTeam(playerName)
        await expect(slot.getByLabel('Player connection status')).toHaveClass(/connected/)
      }),
    )

    const adminsPage = new GamePage(pages.get(users[0].steamId)!, gameNumber)
    await adminsPage.forceEnd()
  },
)
