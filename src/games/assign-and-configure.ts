import type { GameNumber } from '../database/models/game.model'
import type { SteamId64 } from '../shared/types/steam-id-64'
import type { GameServerSelection } from './schemas/game-server-selection'
import { assignGameServer } from './assign-game-server'
import { configure } from './rcon/configure'
import { logger } from '../logger'

interface SelectGameServer {
  selected: GameServerSelection
  actor: SteamId64
}

export async function assignAndConfigure(gameNumber: GameNumber, select: SelectGameServer) {
  await assignGameServer(gameNumber, select)
  // Fire-and-forget: configure() handles its own errors internally.
  // This catch only covers errors that escape before configure() starts (e.g. findOne failure).
  configure(gameNumber).catch((error: unknown) => {
    logger.error({ error, gameNumber }, 'assignAndConfigure(): configure() failed to start')
  })
}
