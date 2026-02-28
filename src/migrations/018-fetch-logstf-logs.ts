import { collections } from '../database/collections'
import { logger } from '../logger'
import { extractLogId } from '../logs-tf/extract-log-id'

export async function up() {
  const existingLogIds = await collections.logsTfLogs.distinct('logId')
  const existingLogIdSet = new Set(existingLogIds)

  const games = await collections.games
    .find({ logsUrl: { $exists: true } }, { projection: { number: 1, logsUrl: 1 } })
    .toArray()

  let scheduled = 0
  for (const game of games) {
    const logId = extractLogId(game.logsUrl!)
    if (!logId || existingLogIdSet.has(logId)) continue

    const at = new Date(Date.now() + scheduled * 2000)
    await collections.tasks.insertOne({
      name: 'logsTf:fetchLog',
      args: { gameNumber: game.number, logId },
      at,
    })
    scheduled++
  }

  logger.info(`scheduled ${scheduled} logsTf:fetchLog tasks for backfill`)
}
