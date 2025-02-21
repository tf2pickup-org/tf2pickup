import fp from 'fastify-plugin'
import { HallOfFamePage } from './views/html/hall-of-fame.page'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    app.get('/hall-of-fame', async (request, reply) => {
      reply.status(200).html(await HallOfFamePage({ user: request.user }))
    })
  },
  {
    name: 'hall of fame routes',
  },
)
