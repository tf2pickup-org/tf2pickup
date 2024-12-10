import fp from 'fastify-plugin'

export default fp(
  async app => {
    await app.register((await import('./routes')).default)
  },
  {
    name: 'hall of fame',
  },
)
