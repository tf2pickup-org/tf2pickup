import { secondsToMilliseconds } from 'date-fns'
import { mergeTests } from '@playwright/test'
import { accessMongoDb } from '../fixtures/access-mongo-db'
import { launchGame, expect } from '../fixtures/launch-game'

const test = mergeTests(launchGame, accessMongoDb)

test.beforeEach(async ({ db }) => {
  const configuration = db.collection('configuration')
  await configuration.updateOne(
    { key: 'games.join_gameserver_timeout' },
    { $set: { value: secondsToMilliseconds(30) } },
    { upsert: true },
  )
  await configuration.updateOne(
    { key: 'games.rejoin_gameserver_timeout' },
    { $set: { value: secondsToMilliseconds(20) } },
    { upsert: true },
  )
})

test('renders join game button', async ({ gameNumber, players, gameServer }) => {
  const page = players.find(p => p.playerName === 'LlamaDrama')!.gamePage(gameNumber)
  await expect(page.waitingForGameServer()).toBeVisible()

  await expect(page.gameEvent('Game server initialized')).toBeVisible({
    timeout: secondsToMilliseconds(15),
  })

  const joinGameButton = page.joinGameButton()
  await Promise.all(
    Array.from(Array(29).keys()).map(
      async i =>
        await expect
          .soft(joinGameButton)
          .toHaveText(new RegExp(`join in 0:\\d?${i}`), { timeout: (30 - i) * 1000 }),
    ),
  )

  await gameServer.playerConnects('LlamaDrama')
  await expect(joinGameButton).toContainText('join game')
})
