import fp from 'fastify-plugin'
import assignGameServer from './assign-game-server'

export default fp(async app => {
  await app.register(assignGameServer)
})
