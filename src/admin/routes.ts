import fp from 'fastify-plugin'

export default fp(
  async app => {
    await app.register((await import('./map-pool')).default)
    await app.register((await import('./player-action-logs')).default)
    await app.register((await import('./player-restrictions')).default)
    await app.register((await import('./scramble-maps')).default)
    await app.register((await import('./view-for-nerds')).default)
    await app.register((await import('./voice-server')).default)
  },
  {
    name: 'admin routes',
  },
)
