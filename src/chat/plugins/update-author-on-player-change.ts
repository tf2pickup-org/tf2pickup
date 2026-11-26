import fp from 'fastify-plugin'
import { isEqual } from 'es-toolkit'
import { events } from '../../events'
import { collections } from '../../database/collections'
import { players } from '../../players'
import { safe } from '../../utils/safe'
import { chatAuthor } from '../chat-author'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    events.on(
      'player:updated',
      safe(async ({ before, after }) => {
        if (isEqual(chatAuthor(before), chatAuthor(after))) {
          return
        }

        // the event is emitted under the player's lock but handled after it is released; writing the
        // current player under the lock keeps an older update from landing last
        await players.forPlayer(after.steamId).runExclusive(async () => {
          const player = await collections.players.findOne(
            { steamId: after.steamId },
            { projection: { steamId: 1, name: 1, roles: 1 } },
          )
          if (!player) {
            return
          }

          await collections.chatMessages.updateMany(
            { 'author.steamId': player.steamId },
            { $set: { author: chatAuthor(player) } },
          )
        })
      }),
    )
  },
  { name: 'update chat author on player change' },
)
