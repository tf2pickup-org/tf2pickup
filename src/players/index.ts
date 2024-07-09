import fp from 'fastify-plugin'
import { bySteamId } from './by-steam-id'
import { getPlayerGameCountOnClasses } from './get-player-game-count-on-classes'
import { update } from './update'
import { events } from '../events'
import { GoToGame } from './views/html/go-to-game'

export const players = {
  bySteamId,
  getPlayerGameCountOnClass: getPlayerGameCountOnClasses,
  update,
} as const

export default fp(
  async app => {
    await app.register((await import('./plugins/assign-active-game')).default)
    await app.register((await import('./routes')).default)

    events.on('player:updated', ({ before, after }) => {
      // redirect player to the new game
      if (before.activeGame === undefined && after.activeGame !== undefined) {
        app.gateway
          .toPlayers(after.steamId)
          .broadcast(async () => await GoToGame(after.activeGame!))
      }
    })
  },
  { name: 'players' },
)
