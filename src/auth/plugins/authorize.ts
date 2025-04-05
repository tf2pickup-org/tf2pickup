import fp from 'fastify-plugin'
import type { PlayerRole } from '../../database/models/player.model'

declare module 'fastify' {
  interface FastifyContextConfig {
    authorize?: PlayerRole[]
  }
}

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    app.addHook('preHandler', async (request, reply) => {
      if (!request.routeOptions.config.authorize) {
        return
      }

      if (!request.user) {
        return reply.unauthorized()
      }

      const roles = request.routeOptions.config.authorize
      if (roles.some(r => request.user!.player.roles.includes(r))) {
        return
      }

      return reply.forbidden()
    })
  },
  {
    name: 'auth/authorize',
    dependencies: ['auth/steam'],
  },
)
