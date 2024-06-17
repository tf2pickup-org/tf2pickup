import fp from 'fastify-plugin'
import { update } from './update'
import { events } from '../events'
import { GameSummary } from './views/html/game-summary'
import { GameSlotList } from './views/html/game-slot-list'

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

    events.on('game:updated', ({ after }) => {
      app.gateway.broadcast(async actor => await GameSummary({ game: after, actor }))
      app.gateway.broadcast(async () => await GameSlotList({ game: after }))
    })

    await app.register((await import('./routes')).default)
  },
  {
    name: 'games',
  },
)
