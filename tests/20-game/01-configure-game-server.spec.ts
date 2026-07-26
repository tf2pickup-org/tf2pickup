import { launchGame, expect } from '../fixtures/launch-game'
import { secondsToMilliseconds } from 'date-fns'
import { GamePage } from '../pages/game.page'

launchGame('configure game server @6v6 @9v9', async ({ players, gameNumber, page, gameServer }) => {
  await Promise.all(
    players.map(async player => {
      const page = await player.gamePage(gameNumber)
      await expect(page.gameEvent('Game server assigned')).toBeVisible()

      const connectString = page.connectString()
      await expect(connectString).toHaveText(/^connect .+;\s?password (.+)$/, {
        timeout: secondsToMilliseconds(30),
      })

      const [, password] =
        /^connect .+;\s?password (.+)$/.exec(await connectString.innerText()) ?? []
      expect(gameServer.cvar('sv_password').value).toEqual(password)

      await expect(page.gameEvent('Game server initialized')).toBeVisible()
      await expect(page.joinGameButton()).toBeVisible()

      await expect(gameServer).toHaveCommand(`sm_game_player_add ${player.steamId}`)
    }),
  )

  // default "auto" hides connect info from spectators on non-serveme.tf servers
  const gamePage = new GamePage(page, gameNumber)
  await gamePage.goto()
  await expect(gamePage.connectString()).toHaveText('hidden')
  await expect(gamePage.watchStvButton()).not.toBeVisible()
})
