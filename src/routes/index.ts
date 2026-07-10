import { QueuePage } from '../queue-auto/views/html/queue.page'
import { defaultGamemode, enabledGamemodes } from '../shared/enabled-gamemodes'
import { routes } from '../utils/routes'
import disableCache from 'fastify-disablecache'

export default routes(async app => {
  await app.register(disableCache)
  app.get('/', async (_req, reply) => {
    return reply.html(QueuePage({ gamemode: defaultGamemode }))
  })

  // static per-gamemode routes so /logo.png etc. still fall through to the
  // static file handler
  for (const gamemode of enabledGamemodes) {
    app.get(`/${gamemode}`, async (_req, reply) => {
      return reply.html(QueuePage({ gamemode }))
    })
  }
})
