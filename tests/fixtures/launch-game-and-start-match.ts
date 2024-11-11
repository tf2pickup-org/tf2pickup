import { launchGameAndInitialize } from './launch-game-and-initialize'

export const launchGameAndStartMatch = launchGameAndInitialize.extend({
  gameNumber: async ({ gameNumber, gameServer }, use) => {
    await gameServer.connectAllPlayers()
    await gameServer.matchStarts()
    await use(gameNumber)
    await gameServer.matchEnds()
  },
})

export { expect } from './launch-game-and-initialize'
