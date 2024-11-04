import { minutesToMilliseconds } from 'date-fns'
import { users } from '../data'
import { expect, launchGame } from '../fixtures/launch-game'
import { GamePage } from '../pages/game.page'
import { waitABit } from '../utils/wait-a-bit'

launchGame('auto requests substitute', async ({ steamIds, gameNumber, page, gameServer }) => {
  launchGame.setTimeout(minutesToMilliseconds(7))
  // wait for the gameserver to be configured
  const gamePage = new GamePage(page, gameNumber)
  await gamePage.goto()
  await expect(gamePage.gameEvent('Game server assigned')).toBeVisible()
  await expect(gamePage.gameEvent('Game server initialized')).toBeVisible({ timeout: 13000 })

  const queueUsers = steamIds.slice(0, 12)
  const connectingPlayers = queueUsers.slice(0, 11)
  const offlinePlayer = users.find(u => u.steamId === queueUsers[11])!

  await Promise.all(
    connectingPlayers.map(async steamId => {
      const playerName = users.find(u => u.steamId === steamId)!.name
      await gameServer.playerConnects(playerName)
    }),
  )

  await waitABit(minutesToMilliseconds(5))
  await expect(gamePage.gameEvent(`bot requested substitute`)).toBeVisible()
  await expect(gamePage.playerLink(offlinePlayer.name)).not.toBeVisible()
})
