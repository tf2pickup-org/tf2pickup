import fp from 'fastify-plugin'

declare module 'fastify' {
  interface FastifyContextConfig {
    authenticate?: boolean
  }
}

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    app.addHook('onRequest', async (request, reply) => {
      if (!request.routeOptions.config.authenticate) {
        return
      }

      if (!request.user) {
        return reply.unauthorized()
      }
    })
  },
  {
    name: 'authenticate',
  },
)
