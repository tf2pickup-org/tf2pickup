import type { Filter } from 'mongodb'
import { collections } from '../../database/collections'
import type { PlayerActionEntryModel } from '../../database/models/player-action-entry.model'

export async function getLogs(params?: { before?: Date }) {
  let filter: Filter<PlayerActionEntryModel> = {}
  if (params?.before) {
    filter = { timestamp: { $lt: params.before } }
  }

  return await collections.playerActions
    .find(filter, { sort: { timestamp: -1 }, limit: 20 })
    .toArray()
}
