import type { AnyBulkWriteOperation } from 'mongodb'
import { collections } from '../database/collections'
import { database } from '../database/database'
import { PlayerRole } from '../database/models/player.model'
import { deletedUserSteamId, type SteamId64 } from '../shared/types/steam-id-64'

// The author was a steam id, looked up on every render; it's a copy of the player now.
export async function up() {
  const chatMessages = database.collection<{ author: SteamId64 }>('chat.messages')
  const authors = new Map(
    (
      await collections.players
        .find({}, { projection: { steamId: 1, name: 1, roles: 1 } })
        .toArray()
    ).map(player => [
      player.steamId,
      {
        steamId: player.steamId,
        name: player.name,
        admin: player.roles.includes(PlayerRole.admin),
      },
    ]),
  )
  const deleted = { steamId: deletedUserSteamId, name: '', admin: false }

  let batch: AnyBulkWriteOperation<{ author: SteamId64 }>[] = []
  for await (const { _id, author } of chatMessages.find(
    { author: { $type: 'string' } },
    { projection: { author: 1 } },
  )) {
    batch.push({
      updateOne: {
        filter: { _id },
        update: { $set: { author: authors.get(author) ?? deleted } as never },
      },
    })
    if (batch.length === 1000) {
      await chatMessages.bulkWrite(batch, { ordered: false })
      batch = []
    }
  }
  if (batch.length > 0) {
    await chatMessages.bulkWrite(batch, { ordered: false })
  }
}
