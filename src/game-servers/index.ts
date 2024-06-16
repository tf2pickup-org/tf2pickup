import fp from 'fastify-plugin'

export default fp(
  async app => {
    await app.register((await import('./plugins/auto-assign-game-server')).default)
  },
  {
    name: 'game servers',
  },
)
