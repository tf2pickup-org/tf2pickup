import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { Readable } from 'stream'
import z from 'zod'
import { games } from '../../../../games'
import { collections } from '../../../../database/collections'
import { environment } from '../../../../environment'
import { gameNumber } from '../../../../games/schemas/game-number'

// eslint-disable-next-line @typescript-eslint/require-await
export default async function (app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get(
    '/',
    {
      schema: {
        params: z.object({ number: gameNumber }),
      },
    },
    async (request, reply) => {
      const { number } = request.params
      const game = await games.findOne({ number })
      if (!game.logSecret) {
        return reply.status(404).send('No logs available for this game')
      }

      const log = await collections.gameLogs.findOne({ logSecret: game.logSecret })
      if (!log) {
        return reply.status(404).send('No logs available for this game')
      }

      const stream = Readable.from(log.logs).map(line => `${line}\n`)
      return await reply
        .header(
          'content-disposition',
          `attachment; filename=${environment.WEBSITE_NAME}-${number}.log`,
        )
        .type('text/plain')
        .send(stream)
    },
  )
}
