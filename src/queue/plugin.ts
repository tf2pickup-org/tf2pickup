import fp from 'fastify-plugin'
import { queue } from './views/queue'
import { initialize } from './initialize'
import { logger } from '../logger'

// eslint-disable-next-line @typescript-eslint/require-await
export default fp(async app => {
  await initialize()

  app.get('/', async (req, reply) => {
    reply.status(200).html(await queue(req.user))
  })

  app.get('/queue/ws', { websocket: true }, (socket, req) => {
    if (req.user) {
      logger.info(`${req.user.player.name} connected`)
      socket.on('message', message => {
        logger.info(`${req.user!.player.name} sent: ${message}`)
      })
    }
  })
})
