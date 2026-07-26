import { configuration } from '../configuration'
import { collections } from '../database/collections'
import type { GameModel } from '../database/models/game.model'
import { logger } from '../logger'
import { queue } from '../queue-auto'
import { queueCaptain } from '../queue-captain'
import { assignGameServer } from './assign-game-server'
import { create } from './create'
import { configure } from './rcon/configure'

export async function launchGame() {
  logger.info('launching game')

  const mode = await configuration.get('queue.mode')
  let game: GameModel

  if (mode === 'captain') {
    try {
      const draft = await collections.captainDraft.findOne({})
      if (!draft?.selectedMap) {
        throw new Error('captain draft not complete')
      }
      logger.trace({ draft }, 'launchGame() captain mode')
      game = await create(draft, draft.selectedMap)
    } catch (error) {
      logger.error({ error }, 'failed to launch game; resetting captain draft')
      await queueCaptain.reset()
      return
    }
  } else {
    try {
      const slots = await queue.getSlots()
      const map = await queue.getMapWinner()
      const friends = await queue.getFriends()
      logger.trace({ slots, map, friends }, 'launchGame() auto mode')
      game = await create(slots, map, friends)
    } catch (error) {
      logger.error({ error }, 'failed to launch game; reverting queue')
      await queue.unreadyQueue()
      return
    }
  }

  await assignGameServer(game.number, { retries: 3 })
  void configure(game.number)
}
