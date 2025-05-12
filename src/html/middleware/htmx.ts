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
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    // eslint-disable-next-line @typescript-eslint/require-await
    app.addHook('onRequest', async request => {
      request.boosted = request.headers['hx-boosted'] === 'true'
    })

    app.addHook('onSend', async (_, response) => {
      const contentType = response.getHeader('content-type')
      if (typeof contentType === 'string' && contentType.startsWith('text/html')) {
        response.vary('hx-boosted')
      }
    })

    // eslint-disable-next-line @typescript-eslint/require-await
    app.addHook('preHandler', async request => {
      request.requestContext.set('boosted', request.boosted)
    })
  },
  {
    name: 'htmx middleware',
  },
)
