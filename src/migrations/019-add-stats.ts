import { collections } from '../database/collections'
import { logger } from '../logger'
import { GameState } from '../database/models/game.model'
import { GameEventType } from '../database/models/game-event.model'

export async function up() {
  const games = await collections.games.find({ state: GameState.ended }).toArray()

  let totalDurationMs = 0
  let counted = 0

  for (const game of games) {
    const startedEvent = game.events.find(e => e.event === GameEventType.gameStarted)
    const endedEvent = game.events.find(e => e.event === GameEventType.gameEnded)

    if (!startedEvent || !endedEvent) {
      continue
    }

    totalDurationMs += endedEvent.at.getTime() - startedEvent.at.getTime()
    counted++
  }

  await collections.stats.updateOne(
    { _id: 'total' },
    { $inc: { totalDurationMs } },
    { upsert: true },
  )

  logger.info(`backfilled game durations from ${counted} games (total: ${totalDurationMs}ms)`)
}
