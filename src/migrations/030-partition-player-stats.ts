import { MongoServerError } from 'mongodb'
import { collections } from '../database/collections'
import { environment } from '../environment'
import { Gamemode } from '../shared/types/gamemode'

// Per-class game counts used to be a single map, because an instance ran exactly one gamemode.
export async function up() {
  const gamemode = environment.QUEUE_CONFIG

  await collections.players.updateMany(
    {
      'stats.gamesByClass': { $type: 'object' },
      $nor: Object.values(Gamemode).map(g => ({ [`stats.gamesByClass.${g}`]: { $exists: true } })),
    },
    [{ $set: { 'stats.gamesByClass': { [gamemode]: '$stats.gamesByClass' } } }],
  )

  try {
    await collections.players.dropIndex('stats.gamesByClass.medic_-1')
  } catch (error) {
    if (!(error instanceof MongoServerError && error.codeName === 'IndexNotFound')) {
      throw error
    }
  }
}
