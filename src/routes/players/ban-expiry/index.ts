import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { banExpiryFormSchema } from '../../../players/schemas/ban-expiry-form.schema'
import { players } from '../../../players'
import { format } from 'date-fns'

// eslint-disable-next-line @typescript-eslint/require-await
export default async function (app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get(
    '/players/ban-expiry',
    {
      schema: {
        querystring: banExpiryFormSchema,
      },
    },
    async (request, reply) => {
      const banExpiryDate = players.getBanExpiryDate(request.query)
      reply.status(200).html(format(banExpiryDate, 'dd.MM.yyyy HH:mm'))
    },
  )
}
