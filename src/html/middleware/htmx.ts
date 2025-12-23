import type { FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'
import type { Jsonifiable } from 'type-fest'

declare module 'fastify' {
  interface FastifyRequest {
    boosted: boolean
    partialFor: string | null
    isPartialFor: (target: string) => boolean
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
      request.partialFor =
        request.headers['hx-history-restore-request'] !== 'true' &&
        request.headers['hx-request'] === 'true'
          ? (request.headers['hx-target'] as string)
          : null
    })

    app.addHook('onSend', async (_, response) => {
      const contentType = response.getHeader('content-type')
      if (typeof contentType === 'string' && contentType.startsWith('text/html')) {
        response.vary('hx-boosted')
      }
    })

    app.decorateRequest('isPartialFor', isPartialFor)

    // eslint-disable-next-line @typescript-eslint/require-await
    app.addHook('preHandler', async request => {
      request.requestContext.set('boosted', request.boosted)
    })

    function isPartialFor(this: FastifyRequest, target: string) {
      return this.partialFor === target
    }

    app.decorateReply('trigger', function (val) {
      this.header('HX-Trigger', JSON.stringify(val))
      return this
    })
  },
  {
    name: 'htmx middleware',
  },
)
