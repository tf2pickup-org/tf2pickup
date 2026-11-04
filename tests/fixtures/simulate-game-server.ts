import { test } from '@playwright/test'
import { GameServerSimulator } from '../game-server-simulator'

export const simulateGameServer = test.extend<{ gameServer: GameServerSimulator }>({
  gameServer: async ({}, use) => {
    const apiAddress = process.env['API_URL']
    const secret = process.env['GAME_SERVER_SECRET']
    if (!apiAddress || !secret) {
      throw new Error('API_URL and GAME_SERVER_SECRET must be set')
    }

    const gameServer = new GameServerSimulator(apiAddress, secret)
    await gameServer.run()
    await use(gameServer)
    await gameServer.close()
  },
})
