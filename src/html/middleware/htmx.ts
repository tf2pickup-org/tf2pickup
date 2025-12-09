import fp from 'fastify-plugin'
import type { Jsonifiable } from 'type-fest'

declare module 'fastify' {
  interface FastifyRequest {
    boosted: boolean
  }

  interface FastifyReply {
    trigger: (val: Record<string, Jsonifiable>) => this
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

    app.decorateReply('trigger', function (val) {
      this.header('HX-Trigger', JSON.stringify(val))
      return this
    })
  },
  {
    name: 'htmx middleware',
  },
)
