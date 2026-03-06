import { discord } from '../../../discord'
import { routes } from '../../../utils/routes'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  if (!discord.oauthEnabled) {
    return
  }

  app.get(
    '/',
    {
      config: {
        authenticate: true,
      },
    },
    async (request, reply) => {
      const url = discord.makeOauthRedirectUrl(
        await discord.state.make({ steamId: request.user!.player.steamId }),
      )
      reply.redirect(url, 302)
    },
  )
})
