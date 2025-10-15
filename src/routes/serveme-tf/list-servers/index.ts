import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { PlayerRole } from '../../../database/models/player.model'
import { servemeTf } from '../../../serveme-tf'
import { errors } from '../../../errors'
import { ServemeTfServerList } from '../../../serveme-tf/views/html/serveme-tf-server-list'

// eslint-disable-next-line @typescript-eslint/require-await
export default async function (app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get(
    '/',
    {
      config: {
        authorize: [PlayerRole.admin],
      },
    },
    async (_, reply) => {
      if (!servemeTf.client) {
        throw errors.badRequest(`serveme.tf is disabled`)
      }

      const { servers } = await servemeTf.client.findOptions()
      return reply.html(ServemeTfServerList({ servers }))
    },
  )
}
