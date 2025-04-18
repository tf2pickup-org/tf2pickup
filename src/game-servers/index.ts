import fp from 'fastify-plugin'
import { assign } from './assign'

export const gameServers = {
  assign,
} as const

export default fp(
  async app => {
    await app.register((await import('./plugins/auto-assign-game-server')).default)
  },
  {
    name: 'game servers',
  },
)
