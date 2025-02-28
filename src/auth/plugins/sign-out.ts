import fp from 'fastify-plugin'
import { environment } from '../../environment'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    app.get('/auth/sign-out', async (request, reply) => {
      request.session.regenerate()
      return await reply.redirect(environment.WEBSITE_URL, 302).send()
    })
  },
  {
    name: 'sign out',
  },
)
