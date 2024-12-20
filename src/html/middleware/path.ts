import fp from 'fastify-plugin'

declare module '@fastify/request-context' {
  interface RequestContextData {
    // Current request url (e.g. /games/1234)
    url: string | undefined
  }
}

// eslint-disable-next-line @typescript-eslint/require-await
export default fp(async app => {
  app.addHook('preHandler', async request => {
    request.requestContext.set('url', request.url)
  })
})
