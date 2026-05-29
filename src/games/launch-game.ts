import { configuration } from '../configuration'
import { collections } from '../database/collections'
import { logger } from '../logger'
import { queue } from '../queue-auto'
import { assignGameServer } from './assign-game-server'
import { create } from './create'
import { configure } from './rcon/configure'

export async function launchGame() {
  logger.info('launching game')

  const mode = await configuration.get('queue.mode')

  if (mode === 'captain') {
    const draft = await collections.captainDraft.findOne({})
    if (!draft?.selectedMap) {
      throw new Error('captain draft not complete')
    }
    logger.trace({ draft }, 'launchGame() captain mode')
    const { number } = await create(draft, draft.selectedMap)
    await assignGameServer(number, { retries: 3 })
    void configure(number)
  } else {
    const slots = await queue.getSlots()
    const map = await queue.getMapWinner()
    const friends = await queue.getFriends()
    logger.trace({ slots, map, friends }, 'launchGame() auto mode')
    const { number } = await create(slots, map, friends)
    await assignGameServer(number, { retries: 3 })
    void configure(number)
  }
}
