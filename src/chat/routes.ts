import fp from 'fastify-plugin'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { send } from './send'
import { ChatPrompt } from '../queue/views/html/chat'

// eslint-disable-next-line @typescript-eslint/require-await
export default fp(async app => {
  app.withTypeProvider<ZodTypeProvider>().post(
    '/chat',
    {
      config: {
        authenticate: true,
      },
      schema: {
        body: z.object({
          message: z.string(),
        }),
      },
    },
    async (request, reply) => {
      await send({
        author: request.user!.player.steamId,
        body: request.body.message,
      })
      return reply.status(201).send(ChatPrompt())
    },
  )
})
