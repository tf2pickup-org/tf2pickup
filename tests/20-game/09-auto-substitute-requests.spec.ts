import { secondsToMilliseconds } from 'date-fns'
import { GamePage } from '../pages/game.page'
import { expect, mergeTests } from '@playwright/test'
import { accessMongoDb } from '../fixtures/access-mongo-db'
import { launchGame } from '../fixtures/launch-game'

const test = mergeTests(launchGame, accessMongoDb)
test.use({ waitForStage: 'launching' })

test.beforeEach(async ({ db }) => {
  const configuration = db.collection('configuration')
  await configuration.updateOne(
    { key: 'games.join_gameserver_timeout' },
    { $set: { value: secondsToMilliseconds(10) } },
    { upsert: true },
  )
  await configuration.updateOne(
    { key: 'games.rejoin_gameserver_timeout' },
    { $set: { value: secondsToMilliseconds(5) } },
    { upsert: true },
  )
})

test.describe('when a player does not connect to the gameserver on time', () => {
  test('should request substitute for them', async ({ gameNumber, page, gameServer, players }) => {
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

test.describe('when a player connects to the gameserver, but then leaves', () => {
  test('should request substitute for them', async ({ gameNumber, page, gameServer, players }) => {
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

test.describe('when the match starts, but then a player leaves', () => {
  test('should request substitute for them', async ({ gameNumber, page, gameServer }) => {
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

test.describe('when a player replaces another player and does not join the gameserver', () => {
  let adminsPage: GamePage
  let tommyGunsPage: GamePage
  let gamePage: GamePage

  test.beforeEach(async ({ gameNumber, page, users, gameServer }) => {
    const tommyGun = users.byName('TommyGun')

    gamePage = new GamePage(page, gameNumber)
    await gamePage.goto()
    adminsPage = await users.getAdmin().gamePage(gameNumber)
    await adminsPage.goto()
    tommyGunsPage = await tommyGun.gamePage(gameNumber)
    await tommyGunsPage.goto()

    await gameServer.connectAllPlayers()
  })

  test.describe('before the match starts', () => {
    test.beforeEach(async ({ gameServer }) => {
      await adminsPage.requestSubstitute('Mayflower')
      await tommyGunsPage.replacePlayer('Mayflower')
      await gameServer.playerDisconnects('Mayflower')
    })

    test('should request substitute for them', async () => {
      await expect
        .poll(() => gamePage.slot('TommyGun').status(), { timeout: secondsToMilliseconds(15) })
        .toBe('waiting for substitute')
      await expect(
        gamePage.gameEvent(/bot requested substitute for.+TommyGun \(reason: Player is offline\)/),
      ).toBeVisible()
    })
  })

  test.describe('after the match starts', () => {
    test.beforeEach(async ({ gameServer }) => {
      await gameServer.matchStarts()

      await adminsPage.requestSubstitute('Mayflower')
      await tommyGunsPage.replacePlayer('Mayflower')
      await gameServer.playerDisconnects('Mayflower')
    })

    test('should request substitute for them', async () => {
      await expect
        .poll(() => gamePage.slot('TommyGun').status(), { timeout: secondsToMilliseconds(15) })
        .toBe('waiting for substitute')
      await expect(
        gamePage.gameEvent(/bot requested substitute for.+TommyGun \(reason: Player is offline\)/),
      ).toBeVisible()
    })
  })
})
