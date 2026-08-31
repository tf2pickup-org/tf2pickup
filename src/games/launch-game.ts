import type { GameModel } from '../database/models/game.model'
import { logger } from '../logger'
import { queue } from '../queue-auto'
import type { Gamemode } from '../shared/types/gamemode'
import { assignGameServer } from './assign-game-server'
import { create } from './create'
import { configure } from './rcon/configure'

export async function launchGame(gamemode: Gamemode) {
  logger.info({ gamemode }, 'launching game')

  const q = queue.for(gamemode)

  let game: GameModel
  try {
    const slots = await q.slots()
    const map = await q.mapWinner()
    const friends = await q.friends()
    logger.trace({ gamemode, slots, map, friends }, 'launchGame()')
    game = await create(slots, map, friends)
  } catch (error) {
    logger.error({ error }, 'failed to launch game; reverting queue')
    await q.unready()
    return
  }

  await assignGameServer(game.number, { retries: 3 })
  void configure(game.number)
}
