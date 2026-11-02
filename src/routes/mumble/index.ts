import { errors } from '../../errors'
import { isVerificationEnabled } from '../../mumble/is-verification-enabled'
import { MumbleVerificationPage } from '../../mumble/views/html/mumble-verification.page'
import { routes } from '../../utils/routes'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.get(
    '/',
    {
      config: {
        authenticate: true,
      },
    },
    async (req, reply) => {
      if (!(await isVerificationEnabled())) {
        throw errors.notFound()
      }

      await reply.status(200).html(MumbleVerificationPage({ steamId: req.user!.player.steamId }))
    },
  )
})
