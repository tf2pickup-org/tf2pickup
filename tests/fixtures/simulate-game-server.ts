import { test } from '@playwright/test'
import { GameServerSimulator } from '../game-server-simulator'

export const simulateGameServer = test.extend<{ gameServer: GameServerSimulator }>({
  // eslint-disable-next-line no-empty-pattern
  gameServer: async ({}, use) => {
    const apiAddress = process.env['WEBSITE_URL']
    const secret = process.env['GAME_SERVER_SECRET']
    if (!apiAddress || !secret) {
      throw new Error('WEBSITE_URL and GAME_SERVER_SECRET must be set')
    }

    const gameServer = new GameServerSimulator(apiAddress, secret)
    await gameServer.run()
    await gameServer.sendHeartbeat()
    await use(gameServer)
    await gameServer.close()
  },
})

export { expect } from '@playwright/test'
