import { collections } from '../database/collections'
import { QueueState } from '../database/models/queue-state.model'
import { events } from '../events'
import { logger } from '../logger'
import { getState } from '../queue/get-state'
import { setState } from '../queue/set-state'

export async function reset(): Promise<void> {
  logger.trace('queue-captain.reset()')
  await collections.queuePlayers.deleteMany({})
  await collections.captainDraft.deleteMany({})

  const state = await getState()
  if (state !== QueueState.waiting) {
    await setState(QueueState.waiting)
  }

  events.emit('queue/players:updated', { players: [] })
  logger.info('captain queue reset')
}
