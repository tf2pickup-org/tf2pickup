import { secondsToMilliseconds } from 'date-fns'
import { expect, launchGameAndInitialize } from '../fixtures/launch-game-and-initialize'
import { GamePage } from '../pages/game.page'
import { mergeTests } from '@playwright/test'
import { accessMongoDb } from '../fixtures/access-mongo-db'
import type { UserContext } from '../user-manager'

const test = mergeTests(launchGameAndInitialize, accessMongoDb)
const offlinePlayer = 'BellBoy'

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
    const connectingPlayers = players.filter(user => user.playerName !== offlinePlayer)

    await Promise.all(
      connectingPlayers.map(async user => {
        await gameServer.playerConnects(user.playerName)
        await gameServer.playerJoinsTeam(user.playerName)
      }),
    )

    const event = gamePage.gameEvent(/requested substitute/)
    await expect(event).toBeVisible({
      timeout: secondsToMilliseconds(12),
    })
    expect(event).toHaveText(/bot requested substitute for.+BellBoy \(reason: Player is offline\)/)
    await expect(gamePage.playerLink(offlinePlayer)).not.toBeVisible()
  })
})

test.describe('when a player connects to the gameserver, but then leaves', () => {
  test('should request substitute for them', async ({ gameNumber, page, gameServer, players }) => {
    const gamePage = new GamePage(page, gameNumber)
    const connectingPlayers = players.filter(user => user.playerName !== offlinePlayer)

    await Promise.all(
      connectingPlayers.map(async user => {
        await gameServer.playerConnects(user.playerName)
        await gameServer.playerJoinsTeam(user.playerName)
      }),
    )

    await gameServer.playerConnects(offlinePlayer)
    await gameServer.playerDisconnects(offlinePlayer)

    await expect(gamePage.gameEvent(/bot requested substitute/)).toBeVisible({
      timeout: secondsToMilliseconds(12),
    })
    await expect(gamePage.playerLink(offlinePlayer)).not.toBeVisible()
  })
})

test.describe('when the match starts, but then a player leaves', () => {
  test('should request substitute for them', async ({ gameNumber, page, gameServer }) => {
    const gamePage = new GamePage(page, gameNumber)

    await gameServer.connectAllPlayers()
    await gameServer.matchStarts()

    await gameServer.playerDisconnects(offlinePlayer)

    await expect(gamePage.gameEvent(/bot requested substitute/)).toBeVisible({
      timeout: secondsToMilliseconds(8),
    })
    await expect(gamePage.playerLink(offlinePlayer)).not.toBeVisible()
  })
})

test.describe('when a player replaces another player and does not join the gameserver', () => {
  let adminsPage: GamePage
  let tommyGunsPage: GamePage
  let gamePage: GamePage
  let mayflower: UserContext

  test.beforeEach(async ({ gameNumber, page, users, gameServer }) => {
    const tommyGun = users.byName('TommyGun')

    gamePage = new GamePage(page, gameNumber)
    adminsPage = users.getAdmin().gamePage(gameNumber)
    await adminsPage.goto()
    tommyGunsPage = tommyGun.gamePage(gameNumber)
    await tommyGunsPage.goto()

    await gameServer.connectAllPlayers()

    mayflower = users.byName('Mayflower')
  })

  test.describe('before the match starts', () => {
    test.beforeEach(async ({ gameServer }) => {
      await adminsPage.requestSubstitute(mayflower.playerName)
      await tommyGunsPage.replacePlayer(mayflower.playerName)
      await gameServer.playerDisconnects(mayflower.playerName)
    })

    test('should request substitute for them', async () => {
      const event = gamePage.gameEvent(/bot requested substitute/)
      await expect(event).toBeVisible({
        timeout: secondsToMilliseconds(8),
      })
    })
  })

  test.describe('after the match starts', () => {
    test.beforeEach(async ({ gameServer }) => {
      await gameServer.matchStarts()

      await adminsPage.requestSubstitute(mayflower.playerName)
      await tommyGunsPage.replacePlayer(mayflower.playerName)
      await gameServer.playerDisconnects(mayflower.playerName)
    })

    test('should request substitute for them', async () => {
      const event = gamePage.gameEvent(/bot requested substitute/)
      await expect(event).toBeVisible({
        timeout: secondsToMilliseconds(8),
      })
    })
  })
})
