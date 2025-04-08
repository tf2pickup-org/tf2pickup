import fp from 'fastify-plugin'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { send } from './send'
import { ChatMessageList, ChatPrompt } from '../queue/views/html/chat'
import { getSnapshot } from './get-snapshot'

// eslint-disable-next-line @typescript-eslint/require-await
export default fp(async app => {
  app
    .withTypeProvider<ZodTypeProvider>()
    .get(
      '/chat',
      {
        schema: {
          querystring: z.object({
            before: z.string().transform(val => new Date(Number(val))),
          }),
        },
      },
      async (request, reply) => {
        const { before } = request.query
        const messages = await getSnapshot({ before })
        return reply.status(200).send(await ChatMessageList({ messages }))
      },
    )
    .post(
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
