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
      const roles = request.routeOptions.config.authorize
      if (!roles) {
        return
      }

      if (request.user && roles.some(r => request.user!.player.roles.includes(r))) {
        return
      }

      if (request.routeOptions.url?.startsWith('/admin')) {
        reply.callNotFound()
        return
      }

      if (!request.user) {
        return reply.unauthorized()
      }

      return reply.forbidden()
    })
  },
  {
    name: 'auth/authorize',
    dependencies: ['auth/steam'],
  },
)
