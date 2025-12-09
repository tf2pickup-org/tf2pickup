import { z } from 'zod'
import { chat } from '../../chat'
import { ChatMessageList, ChatPrompt } from '../../queue/views/html/chat'
import { routes } from '../../utils/routes'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app
    .get(
      '/',
      {
        config: {
          authenticate: true,
        },
        schema: {
          querystring: z.object({
            before: z.string().transform(val => new Date(Number(val))),
          }),
        },
      },
      async (request, reply) => {
        const { before } = request.query
        const messages = await chat.getSnapshot({ before })
        return reply.status(200).send(await ChatMessageList({ messages }))
      },
    )
    .post(
      '/',
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
        await chat.send({
          author: request.user!.player.steamId,
          body: request.body.message,
        })
        return reply.status(201).send(ChatPrompt())
      },
    )
})
