import fp from 'fastify-plugin'
import { events } from '../../events'
import { collections } from '../../database/collections'
import { safe } from '../../utils/safe'
import { ChatMentionNotification } from '../views/html/chat-mention-notification'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    events.on(
      'chat:messageSent',
      safe(async ({ message }) => {
        if (message.mentions.length === 0) {
          return
        }

        await Promise.all(
          message.mentions.map(async steamId => {
            const isOnline = await collections.onlinePlayers.findOne({ steamId })
            if (!isOnline) {
              return
            }

            app.gateway
              .to({ player: steamId })
              .send(async actor => await ChatMentionNotification(actor!))
          }),
        )
      }),
    )
  },
  { name: 'notify mentioned players' },
)
