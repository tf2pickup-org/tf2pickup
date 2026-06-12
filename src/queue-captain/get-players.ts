import { collections } from '../database/collections'
import type { QueuePlayerModel } from '../database/models/queue-player.model'

export async function getPlayers(): Promise<QueuePlayerModel[]> {
  return await collections.queuePlayers.find({}).toArray()
}
