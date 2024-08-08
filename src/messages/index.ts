import fp from 'fastify-plugin'

declare module '@fastify/request-context' {
  interface RequestContextData {
    messages: Record<string, string[] | undefined> | undefined
  }
}

// eslint-disable-next-line @typescript-eslint/require-await
export default fp(async app => {
  app.addHook('preHandler', async (req, reply) => {
    const messages = reply.flash() as Record<string, string[] | undefined>
    req.requestContext.set('messages', messages)
  })
})
