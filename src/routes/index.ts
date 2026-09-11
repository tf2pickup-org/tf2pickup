import { QueuePage } from '../queue-auto/views/html/queue.page'
import { routes } from '../utils/routes'
import { defaultGamemode } from '../shared/default-gamemode'
import { enabledGamemodes } from '../shared/enabled-gamemodes'
import disableCache from 'fastify-disablecache'

export default routes(async app => {
  await app.register(disableCache)
  app.get('/', async (_req, reply) => {
    return reply.html(QueuePage({ gamemode: defaultGamemode }))
  })

  for (const gamemode of enabledGamemodes) {
    if (gamemode === defaultGamemode) {
      continue
    }
    app.get(`/${gamemode}`, async (_req, reply) => {
      return reply.html(QueuePage({ gamemode }))
    })
  }
})
