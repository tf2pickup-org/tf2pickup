import fp from 'fastify-plugin'
import { bySteamId } from './by-steam-id'
import { getPlayerGameCountOnClasses } from './get-player-game-count-on-classes'
import { update } from './update'
import { resolve } from 'node:path'

export const players = {
  bySteamId,
  getPlayerGameCountOnClass: getPlayerGameCountOnClasses,
  update,
} as const

export default fp(
  async app => {
    await app.register((await import('@fastify/autoload')).default, {
      dir: resolve(import.meta.dirname, 'plugins'),
    })
    await app.register((await import('./routes')).default)
  },
  { name: 'players' },
)
