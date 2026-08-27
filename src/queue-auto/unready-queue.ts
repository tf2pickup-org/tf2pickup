import { collections } from '../database/collections'
import { QueueState } from '../database/models/queue-state.model'
import { logger } from '../logger'
import type { Gamemode } from '../shared/types/gamemode'
import { setState } from '../queue/set-state'
import { unready } from './unready'

export async function unreadyQueue(gamemode: Gamemode) {
  logger.info({ gamemode }, 'unready queue')
  await setState(gamemode, QueueState.waiting)
  const allPlayers = (
    await collections.queueSlots.find({ gamemode, player: { $ne: null } }).toArray()
  ).map(slot => slot.player!.steamId)
  await unready(gamemode, ...allPlayers)
}
