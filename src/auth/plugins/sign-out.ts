import fp from 'fastify-plugin'
import { environment } from '../../environment'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    app.get('/auth/sign-out', async (request, reply) => {
      const returnUrl = request.cookies['return_url'] ?? environment.WEBSITE_URL

      return await reply
        .clearCookie('return_url')
        .clearCookie('token')
        .redirect(returnUrl, 302)
        .send()
    })
  },
  {
    name: 'sign out',
  },
)
