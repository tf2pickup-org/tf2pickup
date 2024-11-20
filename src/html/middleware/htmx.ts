import fp from 'fastify-plugin'

declare module 'fastify' {
  interface FastifyRequest {
    boosted: boolean
  }
}

declare module '@fastify/request-context' {
  interface RequestContextData {
    boosted: boolean
  }
}

export default fp(
  async app => {
    app.addHook('onRequest', async (request, response) => {
      request.boosted = request.headers['hx-boosted'] === 'true'
      response.header('vary', 'hx-boosted')
    })

    app.addHook('preHandler', async request => {
      request.requestContext.set('boosted', request.boosted)
    })
  },
  {
    name: 'htmx middleware',
  },
)
