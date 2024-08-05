import { expect } from '@playwright/test'
import { launchGame } from '../fixtures/launch-game'
import { secondsToMilliseconds } from 'date-fns'
import { GamePage } from '../pages/game.page'
import { users } from '../data'

launchGame('configure game server', async ({ steamIds, gameNumber, pages, page, gameServer }) => {
  const players = steamIds.slice(0, 12)

  await Promise.all(
    players.map(async steamId => {
      const page = new GamePage(pages.get(steamId)!, gameNumber)
      await expect(page.gameEvent('Game server assigned')).toBeVisible()

      const connectString = page.connectString()
      await expect(connectString).toHaveText(/^connect .+;\s?password (.+)$/, {
        timeout: secondsToMilliseconds(30),
      })

      const [, password] =
        (await connectString.innerText()).match(/^connect .+;\s?password (.+)$/) ?? []
      expect(gameServer.cvar('sv_password').value).toEqual(password)

      await expect(page.gameEvent('Game server initialized')).toBeVisible()
      await expect(page.joinGameButton()).toBeVisible()

      expect(gameServer.addedPlayers.some(p => p.steamId64 === steamId)).toBe(true)
    }),
  )

  const gamePage = new GamePage(page, gameNumber)
  await gamePage.goto()
  await expect(gamePage.connectString()).toHaveText(/^connect ([a-z0-9\s.:]+)(;\s?password tv)?$/)
  await expect(gamePage.watchStvButton()).toBeVisible()

  const adminsPage = new GamePage(pages.get(users[0].steamId)!, gameNumber)
  await adminsPage.forceEnd()
})
