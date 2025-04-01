import { GameEventType } from '../database/models/game-event.model'
import type { GameNumber } from '../database/models/game.model'
import { events } from '../events'
import { logger } from '../logger'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { update } from './update'

export async function requestGameServerReinitialization(gameNumber: GameNumber, actor?: SteamId64) {
  logger.trace({ gameNumber, actor }, 'games.requestGameServerReinitialization()')
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
  events.emit('game:gameServerReinitializationRequested', { game })
}
