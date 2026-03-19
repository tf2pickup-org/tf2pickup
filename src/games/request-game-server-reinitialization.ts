import { GameEventType } from '../database/models/game-event.model'
import type { GameNumber } from '../database/models/game.model'
import { logger } from '../logger'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { tasks } from '../tasks'
import { configure } from './rcon/configure'
import { update } from './update'

export async function reinitializeGameServer(gameNumber: GameNumber, actor?: SteamId64) {
  logger.trace({ gameNumber, actor }, 'games.reinitializeGameServer()')
  const game = await update(
    { number: gameNumber },
    {
      $push: {
        events: {
          at: new Date(),
          event: GameEventType.gameServerReinitializationOrdered,
          ...(actor && { actor }),
        },
      },
    },
  )
  await tasks.cancel('games:autoSubstitutePlayer', { gameNumber: game.number })

  // Fire-and-forget: configure() handles its own errors internally.
  // This catch only covers errors that escape before configure() starts (e.g. findOne failure).
  configure(game.number).catch((error: unknown) => {
    logger.error({ error }, 'games.reinitializeGameServer(): configure() failed to start')
  })
}
