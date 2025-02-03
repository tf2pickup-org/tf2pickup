import fp from 'fastify-plugin'
import { PlayerRole } from '../database/models/player.model'

export default fp(
  async app => {
    await app.register((await import('./bypass-registration-restrictions')).default)
    await app.register((await import('./discord')).default)
    await app.register((await import('./game-servers')).default)
    await app.register((await import('./games')).default)
    await app.register((await import('./map-pool')).default)
    await app.register((await import('./player-restrictions')).default)
    await app.register((await import('./view-for-nerds')).default)
    await app.register((await import('./voice-server')).default)

    app.get(
      '/admin',
      {
        config: {
          authorize: [PlayerRole.admin],
        },
      },
      async (_request, reply) => {
        await reply.redirect('/admin/player-restrictions')
      },
    )
  },
  {
    name: 'admin routes',
  },
)
