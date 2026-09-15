import { collections } from '../database/collections'
import { QueueState } from '../database/models/queue-state.model'
import { errors } from '../errors'
import type { Gamemode } from '../shared/types/gamemode'

export async function getState(gamemode: Gamemode): Promise<QueueState> {
  const state = await collections.queueState.findOne({ gamemode })
  if (!state) {
    throw errors.internalServerError('queue state unavailable')
  }

  return state.state
}
