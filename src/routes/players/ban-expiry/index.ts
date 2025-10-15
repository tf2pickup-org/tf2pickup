import { banExpiryFormSchema } from '../../../players/schemas/ban-expiry-form.schema'
import { players } from '../../../players'
import { format } from 'date-fns'
import { routes } from '../../../utils/routes'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.get(
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
})
