import z from 'zod'
import { players } from '../../../../players'
import { steamId64 } from '../../../../shared/schemas/steam-id-64'
import { buildPlayerOgImage } from '../../../../players/build-player-og-image'
import { ogImage } from '../../../../og-image'
import { routes } from '../../../../utils/routes'
import { logger } from '../../../../logger'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.get(
    '/',
    {
      schema: {
        params: z.object({ steamId: steamId64 }),
      },
    },
    async (request, reply) => {
      const player = await players.bySteamId(request.params.steamId, [
        'name',
        'joinedAt',
        'avatar',
        'roles',
        'stats',
      ])

      try {
        const image = await buildPlayerOgImage(player)
        return await reply
          .type('image/png')
          .header('cache-control', 'public, max-age=3600')
          .send(image)
      } catch (error) {
        ogImage.metrics.fallbacks.add(1, { subject: 'player' })
        logger.error(error, `failed to render og image for player ${request.params.steamId}`)
        return reply.redirect('/og-image.png')
      }
    },
  )
})
