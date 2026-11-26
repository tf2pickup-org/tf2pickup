import { collections } from '../database/collections'
import { database } from '../database/database'
import { PlayerRole } from '../database/models/player.model'
import { deletedUserSteamId, type SteamId64 } from '../shared/types/steam-id-64'

// The author was a steam id, looked up on every render; it's a copy of the player now.
export async function up() {
  const chatMessages = database.collection<{ author: SteamId64 }>('chat.messages')
  const authors = await chatMessages.distinct('author', { author: { $type: 'string' } })
  for (const steamId of authors) {
    const player = await collections.players.findOne(
      { steamId },
      { projection: { name: 1, roles: 1 } },
    )
    await chatMessages.updateMany(
      { author: steamId },
      {
        $set: {
          author: {
            steamId: player ? steamId : deletedUserSteamId,
            name: player?.name ?? '',
            admin: player?.roles.includes(PlayerRole.admin) ?? false,
          },
        } as never,
      },
    )
  }
}
