import fp from 'fastify-plugin'
import { events } from '../events'
import { GameSummary } from './views/html/game-summary'

export default fp(
  async app => {
    await app.register((await import('./launch-new-game')).default)
    await app.register((await import('./configure')).default)
    await app.register((await import('./match-event-listener')).default)
    await app.register((await import('./match-event-handler')).default)

    events.on('game:updated', ({ after }) => {
      app.gateway.broadcast(async actor => await GameSummary({ game: after, actor }))
    })

    await app.register((await import('./routes')).default)
  },
  {
    name: 'games',
  },
)
