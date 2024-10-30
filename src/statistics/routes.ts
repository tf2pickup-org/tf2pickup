import fp from 'fastify-plugin'
import { StatisticsPage } from './views/html/statistics.page'
import { bundle } from '../html'
import { resolve } from 'node:path'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    app.get('/statistics', async (req, reply) => {
      reply.status(200).html(await StatisticsPage(req.user))
    })
    app.get('/statistics/bundle.js', async (_request, reply) => {
      await reply
        .header('Content-Type', 'text/javascript')
        .send(await bundle(resolve(import.meta.dirname, 'views', 'html', 'bundle', 'main.js')))
    })
  },
  {
    name: 'statistics routes',
  },
)
