import { secondsToMilliseconds } from 'date-fns'
import { GamePage } from '../pages/game.page'
import { expect } from '@playwright/test'
import { launchGame as test } from '../fixtures/launch-game'

test.use({ waitForStage: 'launching' })

test.beforeEach(async ({ users }) => {
  const page = await users.getAdmin().adminPage()
  await page.configureGames({ joinGameServerTimeout: 10, rejoinGameServerTimeout: 5 })
})

test.describe('when a player does not connect to the gameserver on time @6v6 @9v9', () => {
  test('should request substitute for them @6v6 @9v9', async ({
    gameNumber,
    page,
    gameServer,
    players,
  }) => {
    const gamePage = new GamePage(page, gameNumber)
    await gamePage.goto()
    const connectingPlayers = players.filter(user => user.playerName !== 'BellBoy')

    await Promise.all(
      connectingPlayers.map(async user => {
        await gameServer.playerConnects(user.playerName)
        await gameServer.playerJoinsTeam(user.playerName)
      }),
    )

    await expect
      .poll(() => gamePage.slot('BellBoy').status(), { timeout: secondsToMilliseconds(15) })
      .toBe('waiting for substitute')

    await expect(
      gamePage.gameEvent(/bot requested substitute for.+BellBoy \(reason: Player is offline\)/),
    ).toBeVisible()
    await expect(gamePage.playerLink('BellBoy')).not.toBeVisible()
  })
})

test.describe('when a player connects to the gameserver, but then leaves @6v6 @9v9', () => {
  test('should request substitute for them @6v6 @9v9', async ({
    gameNumber,
    page,
    gameServer,
    players,
  }) => {
    const gamePage = new GamePage(page, gameNumber)
    await gamePage.goto()
    const connectingPlayers = players.filter(user => user.playerName !== 'BellBoy')

    await Promise.all(
      connectingPlayers.map(async user => {
        await gameServer.playerConnects(user.playerName)
        await gameServer.playerJoinsTeam(user.playerName)
      }),
    )

    await gameServer.playerConnects('BellBoy')
    await gameServer.playerDisconnects('BellBoy')

    await expect
      .poll(() => gamePage.slot('BellBoy').status(), { timeout: secondsToMilliseconds(15) })
      .toBe('waiting for substitute')

    await expect(
      gamePage.gameEvent(/bot requested substitute for.+BellBoy \(reason: Player is offline\)/),
    ).toBeVisible()
    await expect(gamePage.playerLink('BellBoy')).not.toBeVisible()
  })
})

test.describe('when the match starts, but then a player leaves @6v6 @9v9', () => {
  test('should request substitute for them @6v6 @9v9', async ({ gameNumber, page, gameServer }) => {
    const gamePage = new GamePage(page, gameNumber)
    await gamePage.goto()

    await gameServer.connectAllPlayers()
    await gameServer.matchStarts()

    await gameServer.playerDisconnects('BellBoy')
    await expect
      .poll(() => gamePage.slot('BellBoy').status(), { timeout: secondsToMilliseconds(15) })
      .toBe('waiting for substitute')
    await expect(
      gamePage.gameEvent(/bot requested substitute for.+BellBoy \(reason: Player is offline\)/),
    ).toBeVisible()
    await expect(gamePage.playerLink('BellBoy')).not.toBeVisible()
  })
})

test.describe('when a player replaces another player and does not join the gameserver @6v6 @9v9', () => {
  let adminsPage: GamePage
  let ghostWalkersPage: GamePage
  let gamePage: GamePage

  test.beforeEach(async ({ gameNumber, page, users, gameServer }) => {
    const ghostWalker = users.byName('GhostWalker')

    gamePage = new GamePage(page, gameNumber)
    await gamePage.goto()
    adminsPage = await users.getAdmin().gamePage(gameNumber)
    await adminsPage.goto()
    ghostWalkersPage = await ghostWalker.gamePage(gameNumber)
    await ghostWalkersPage.goto()

    await gameServer.connectAllPlayers()
  })

  test.describe('before the match starts @6v6 @9v9', () => {
    test.beforeEach(async ({ gameServer }) => {
      await adminsPage.requestSubstitute('Mayflower')
      await ghostWalkersPage.replacePlayer('Mayflower')
      await gameServer.playerDisconnects('Mayflower')
    })

    test('should request substitute for them @6v6 @9v9', async () => {
      await expect
        .poll(() => gamePage.slot('GhostWalker').status(), { timeout: secondsToMilliseconds(15) })
        .toBe('waiting for substitute')
      await expect(
        gamePage.gameEvent(
          /bot requested substitute for.+GhostWalker \(reason: Player is offline\)/,
        ),
      ).toBeVisible()
    })
  })

  test.describe('after the match starts @6v6 @9v9', () => {
    test.beforeEach(async ({ gameServer }) => {
      await gameServer.matchStarts()

      await adminsPage.requestSubstitute('Mayflower')
      await ghostWalkersPage.replacePlayer('Mayflower')
      await gameServer.playerDisconnects('Mayflower')
    })

    test('should request substitute for them @6v6 @9v9', async () => {
      await expect
        .poll(() => gamePage.slot('GhostWalker').status(), { timeout: secondsToMilliseconds(15) })
        .toBe('waiting for substitute')
      await expect(
        gamePage.gameEvent(
          /bot requested substitute for.+GhostWalker \(reason: Player is offline\)/,
        ),
      ).toBeVisible()
    })
  })
})
