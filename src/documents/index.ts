import fp from 'fastify-plugin'

export default fp(
  async app => {
    await app.register((await import('./plugins/insert-defaults')).default)
    await app.register((await import('./routes')).default)
  },
  {
    name: 'documents',
  },
)
