import z from 'zod'
import { games } from '../../../../games'
import { buildGameOgImage } from '../../../../games/build-game-og-image'
import { ogImageFallbacks } from '../../../../og-image/og-image-metrics'
import { GameState } from '../../../../database/models/game.model'
import { routes } from '../../../../utils/routes'
import { logger } from '../../../../logger'

const finalStates = [GameState.ended, GameState.interrupted]

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.get(
    '/',
    {
      schema: {
        params: z.object({ number: games.schemas.gameNumber }),
      },
    },
    async (request, reply) => {
      const game = await games.findOne({ number: request.params.number }, [
        'number',
        'map',
        'state',
        'score',
      ])

      try {
        const image = await buildGameOgImage(game)
        const cacheControl = finalStates.includes(game.state)
          ? 'public, max-age=31536000, immutable'
          : 'public, max-age=300'
        return await reply.type('image/png').header('cache-control', cacheControl).send(image)
      } catch (error) {
        ogImageFallbacks.add(1, { subject: 'game' })
        logger.error(error, `failed to render og image for game #${game.number}`)
        return reply.redirect('/og-image.png')
      }
    },
  )
})
