import fp from 'fastify-plugin'
import { update } from './update'

export const games = {
  update,
} as const

export default fp(
  async app => {
    await app.register((await import('./plugins/launch-new-game')).default)
    await app.register((await import('./plugins/auto-configure')).default)
    await app.register((await import('./plugins/match-event-listener')).default)
    await app.register((await import('./plugins/match-event-handler')).default)
    await app.register((await import('./plugins/game-log-collector')).default)
    await app.register((await import('./plugins/update-clients')).default)
    await app.register((await import('./routes')).default)
  },
  {
    name: 'games',
  },
)
