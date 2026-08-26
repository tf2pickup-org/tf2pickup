import fp from 'fastify-plugin'
import { PlayerRole } from '../database/models/player.model'

declare module 'fastify' {
  interface FastifyContextConfig {
    public?: boolean
  }
}

// Scoped to the /admin route subtree: a route that carries no explicit
// `authorize` config requires the admin role, so forgetting a guard fails
// closed. Explicit `authorize` is left to the global auth/authorize plugin;
// `public: true` opts a route out entirely.
export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    app.addHook('preHandler', async (request, reply) => {
      const { authorize, public: isPublic } = request.routeOptions.config
      if (authorize !== undefined || isPublic) {
        return
      }

      if (!request.user) {
        return reply.unauthorized()
      }

      if (request.user.player.roles.includes(PlayerRole.admin)) {
        return
      }

      return reply.forbidden()
    })
  },
  {
    name: 'auth/admin-authorize',
    dependencies: ['auth/steam'],
  },
)
