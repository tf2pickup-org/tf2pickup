import { escapeRegExp } from 'es-toolkit'
import { z } from 'zod'
import { chat } from '../../chat'
import { MentionList } from '../../chat/views/html/mention-list'
import { collections } from '../../database/collections'
import { ChatMessageList } from '../../queue/views/html/chat'
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
        await reply.status(201).send()
      },
    )
    .get(
      '/mentions',
      {
        config: {
          authenticate: true,
        },
        schema: {
          querystring: z.object({
            q: z.string().optional().default(''),
          }),
        },
      },
      async (request, reply) => {
        const { q } = request.query

        const filter =
          q.length > 0 ? { name: { $regex: `^${escapeRegExp(q)}`, $options: 'i' } } : {}

        const candidates = await collections.onlinePlayers
          .find(filter)
          .sort({ name: 1 })
          .limit(10)
          .toArray()

        return reply.status(200).send(MentionList({ players: candidates }))
      },
    )
})
