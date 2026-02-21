import fp from 'fastify-plugin'
import { events } from '../../events'
import { collections } from '../../database/collections'
import { formatBody } from '../format-body'
import { getMentionNames } from '../get-mention-names'
import { safe } from '../../utils/safe'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    events.on(
      'player:updated',
      safe(async ({ before, after }) => {
        if (before.name === after.name) {
          return
        }

        const cursor = collections.chatMessages.find({
          mentions: after.steamId,
        })

        while (await cursor.hasNext()) {
          const message = await cursor.next()
          if (!message) continue

          const mentionNames = await getMentionNames(message.mentions)
          const body = formatBody(message.originalBody, mentionNames)

          await collections.chatMessages.updateOne({ _id: message._id }, { $set: { body } })
        }
      }),
    )
  },
  { name: 'update mentions on name change' },
)
