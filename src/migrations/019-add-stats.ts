import { secondsToMilliseconds } from 'date-fns'
import { collections } from '../database/collections'
import { logger } from '../logger'
import { GameState } from '../database/models/game.model'
import { GameEventType } from '../database/models/game-event.model'

export async function up() {
  const games = await collections.games.find({ state: GameState.ended }).toArray()

  let totalDurationMs = 0
  let counted = 0
  let countedFromLogs = 0

  for (const game of games) {
    const startedEvent = game.events.find(e => e.event === GameEventType.gameStarted)
    const endedEvent = game.events.find(e => e.event === GameEventType.gameEnded)

    if (startedEvent && endedEvent) {
      totalDurationMs += endedEvent.at.getTime() - startedEvent.at.getTime()
      counted++
      continue
    }

    const logEntry = await collections.logsTfLogs.findOne({ gameNumber: game.number })
    if (logEntry) {
      totalDurationMs += secondsToMilliseconds(logEntry.data.length)
      countedFromLogs++
    }
  }

  await collections.stats.updateOne(
    { _id: 'total' },
    { $inc: { totalDurationMs } },
    { upsert: true },
  )

  logger.info(
    `backfilled game durations from ${counted} games via events and ${countedFromLogs} games via logstf (total: ${totalDurationMs}ms)`,
  )
}
