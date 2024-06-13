import fp from 'fastify-plugin'
import { StatisticsPage } from './views/html/statistics.page'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    app.get('/statistics', async (req, reply) => {
      reply.status(200).html(await StatisticsPage(req.user))
    })
  },
  {
    name: 'statistics routes',
  },
)
