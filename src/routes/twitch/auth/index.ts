import { twitchTv } from '../../../twitch-tv'
import { routes } from '../../../utils/routes'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  if (!twitchTv.enabled) {
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
      const url = twitchTv.makeOauthRedirectUrl(
        await twitchTv.state.make({ steamId: request.user!.player.steamId }),
      )
      reply.redirect(url, 302)
    },
  )
})
