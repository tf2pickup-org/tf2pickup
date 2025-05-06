import { collections } from '../database/collections'
import { logger } from '../logger'
import { hideIpAddresses } from '../utils/hide-ip-addresses'

export async function up() {
  const cursor = collections.gameLogs.find({})
  let n = 0

  while (await cursor.hasNext()) {
    const gameLog = await cursor.next()
    if (gameLog && gameLog.logs.length > 0) {
      const updatedLogs = gameLog.logs.map(logEntry => hideIpAddresses(logEntry))
      await collections.gameLogs.updateOne({ _id: gameLog._id }, { $set: { logs: updatedLogs } })
      n += 1
    }
  }

  logger.info(`updated ${n} game logs`)
}
