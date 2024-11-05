import { secondsToMilliseconds } from 'date-fns'
import { users } from '../data'
import { expect, launchGameAndInitialize } from '../fixtures/launch-game-and-initialize'
import { GamePage } from '../pages/game.page'
import { mergeTests } from '@playwright/test'
import { accessMongoDb } from '../fixtures/access-mongo-db'
import { chooseAdmin } from '../fixtures/choose-admin'

const test = mergeTests(launchGameAndInitialize, accessMongoDb, chooseAdmin)

test.beforeEach(async ({ db }) => {
  const configuration = db.collection('configuration')
  await configuration.updateOne(
    { key: 'games.join_gameserver_timeout' },
    { $set: { value: secondsToMilliseconds(10) } },
  )
  await configuration.updateOne(
    { key: 'games.rejoin_gameserver_timeout' },
    { $set: { value: secondsToMilliseconds(5) } },
  )
})

test.describe('when a player does not connect to the gameserver on time', () => {
  test('should request substitute for them', async ({ steamIds, gameNumber, page, gameServer }) => {
    const gamePage = new GamePage(page, gameNumber)
    const queueUsers = steamIds.slice(0, 12)
    const connectingPlayers = queueUsers.slice(0, 11)
    const offlinePlayer = users.find(u => u.steamId === queueUsers[11])!

    await Promise.all(
      connectingPlayers.map(async steamId => {
        const playerName = users.find(u => u.steamId === steamId)!.name
        await gameServer.playerConnects(playerName)
        await gameServer.playerJoinsTeam(playerName)
      }),
    )

    const event = gamePage.gameEvent(/requested substitute/)
    await expect(event).toBeVisible({
      timeout: secondsToMilliseconds(11),
    })
    expect(event).toHaveText(/bot requested substitute for.+BellBoy \(reason: Player is offline\)/)
    await expect(gamePage.playerLink(offlinePlayer.name)).not.toBeVisible()
  })
})

test.describe('when a player connects to the gameserver, but then leaves', () => {
  test('should request substitute for them', async ({ steamIds, gameNumber, page, gameServer }) => {
    const gamePage = new GamePage(page, gameNumber)
    const queueUsers = steamIds.slice(0, 12)
    const connectingPlayers = queueUsers.slice(0, 11)
    const offlinePlayer = users.find(u => u.steamId === queueUsers[11])!

    await Promise.all(
      connectingPlayers.map(async steamId => {
        const playerName = users.find(u => u.steamId === steamId)!.name
        await gameServer.playerConnects(playerName)
        await gameServer.playerJoinsTeam(playerName)
      }),
    )

    await gameServer.playerConnects(offlinePlayer.name)
    await gameServer.playerDisconnects(offlinePlayer.name)

    await expect(gamePage.gameEvent(/bot requested substitute/)).toBeVisible({
      timeout: secondsToMilliseconds(6),
    })
    await expect(gamePage.playerLink(offlinePlayer.name)).not.toBeVisible()
  })
})

test.describe('when the match starts, but then a player leaves', () => {
  test('should request substitute for them', async ({ steamIds, gameNumber, page, gameServer }) => {
    const gamePage = new GamePage(page, gameNumber)
    const queueUsers = steamIds.slice(0, 12)
    const offlinePlayer = users.find(u => u.steamId === queueUsers[11])!

    await gameServer.connectAllPlayers()
    await gameServer.matchStarts()

    await gameServer.playerDisconnects(offlinePlayer.name)

    await expect(gamePage.gameEvent(/bot requested substitute/)).toBeVisible({
      timeout: secondsToMilliseconds(6),
    })
    await expect(gamePage.playerLink(offlinePlayer.name)).not.toBeVisible()
  })
})

test.describe('when a player replaces another player and does not join the gameserver', () => {
  let adminsPage: GamePage
  let tommyGunsPage: GamePage
  let gamePage: GamePage
  const mayflower = users[1]

  test.beforeEach(async ({ gameNumber, page, pages, admin, gameServer }) => {
    const tommyGun = users[12]

    gamePage = new GamePage(page, gameNumber)
    adminsPage = new GamePage(pages.get(admin.steamId)!, gameNumber)
    tommyGunsPage = new GamePage(pages.get(tommyGun.steamId)!, gameNumber)
    await tommyGunsPage.goto()

    await gameServer.connectAllPlayers()
  })

  test.describe('before the match starts', () => {
    test.beforeEach(async ({ gameServer }) => {
      await adminsPage.requestSubstitute(mayflower.name)
      await tommyGunsPage.replacePlayer(mayflower.name)
      await gameServer.playerDisconnects(mayflower.name)
    })

    test('should request substitute for them', async () => {
      const event = gamePage.gameEvent(/bot requested substitute/)
      await expect(event).toBeVisible({
        timeout: secondsToMilliseconds(7),
      })
    })
  })

  test.describe('after the match starts', () => {
    test.beforeEach(async ({ gameServer }) => {
      await gameServer.matchStarts()

      await adminsPage.requestSubstitute(mayflower.name)
      await tommyGunsPage.replacePlayer(mayflower.name)
      await gameServer.playerDisconnects(mayflower.name)
    })

    test('should request substitute for them', async () => {
      const event = gamePage.gameEvent(/bot requested substitute/)
      await expect(event).toBeVisible({
        timeout: secondsToMilliseconds(7),
      })
    })
  })
})
