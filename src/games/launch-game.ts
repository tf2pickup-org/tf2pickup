import { logger } from '../logger'
import { queue } from '../queue-auto'
import type { Gamemode } from '../shared/types/gamemode'
import { assignGameServer } from './assign-game-server'
import { create } from './create'
import { configure } from './rcon/configure'

export async function launchGame(gamemode: Gamemode) {
  logger.info({ gamemode }, 'launching game')
  const slots = await queue.getSlots(gamemode)
  const map = await queue.getMapWinner(gamemode)
  const friends = await queue.getFriends(gamemode)
  logger.trace({ gamemode, slots, map, friends }, 'launchGame()')
  const { number } = await create(gamemode, slots, map, friends)
  await assignGameServer(number, { retries: 3 })
  void configure(number)
}
