import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { PlayerListPage } from '../../players/views/html/player-list.page'

// eslint-disable-next-line @typescript-eslint/require-await
export default async function (app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get('/players', async (req, reply) => {
    reply.status(200).html(await PlayerListPage(req.user))
  })
}
