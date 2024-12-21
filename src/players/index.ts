import fp from 'fastify-plugin'
import { bySteamId } from './by-steam-id'
import { getPlayerGameCountOnClasses } from './get-player-game-count-on-classes'
import { update } from './update'

export const players = {
  bySteamId,
  getPlayerGameCountOnClass: getPlayerGameCountOnClasses,
  update,
} as const

export default fp(
  async app => {
    await app.register((await import('./routes')).default)
  },
  { name: 'players' },
)
