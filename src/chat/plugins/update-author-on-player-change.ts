import fp from 'fastify-plugin'
import { isEqual } from 'es-toolkit'
import { events } from '../../events'
import { collections } from '../../database/collections'
import { safe } from '../../utils/safe'
import { chatAuthor } from '../chat-author'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    events.on(
      'player:updated',
      safe(async ({ before, after }) => {
        const author = chatAuthor(after)
        if (isEqual(chatAuthor(before), author)) {
          return
        }

        await collections.chatMessages.updateMany(
          { 'author.steamId': after.steamId },
          { $set: { author } },
        )
      }),
    )
  },
  { name: 'update chat author on player change' },
)
