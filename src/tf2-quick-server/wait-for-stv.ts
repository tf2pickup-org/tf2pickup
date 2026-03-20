import { secondsToMilliseconds } from 'date-fns'
import { delay } from 'es-toolkit'
import { collections } from '../database/collections'
import { GameEventType } from '../database/models/game-event.model'
import { GameServerProvider, GameState } from '../database/models/game.model'
import { logger } from '../logger'

const stvDelayMs = secondsToMilliseconds(90)

export async function waitForStv(serverId: string): Promise<void> {
  const game = await collections.games.findOne(
    {
      'gameServer.id': serverId,
      'gameServer.provider': GameServerProvider.tf2QuickServer,
      state: { $in: [GameState.ended, GameState.interrupted] },
    },
    { sort: { number: -1 }, projection: { events: 1 } },
  )

  if (!game) {
    return
  }

  const endedEvent = game.events.find(e => e.event === GameEventType.gameEnded)

  if (!endedEvent) {
    return
  }

  const elapsed = Date.now() - endedEvent.at.getTime()
  const remaining = stvDelayMs - elapsed

  if (remaining > 0) {
    logger.info(
      { serverId, remainingMs: remaining },
      'waiting for STV to end before reusing TF2 QuickServer',
    )
    await delay(remaining)
  }
}
