import fp from 'fastify-plugin'
import { events } from '../../events'
import { secondsToMilliseconds } from 'date-fns'
import { configuration } from '../../configuration'
import { LogsTfUploadMethod } from '../../shared/types/logs-tf-upload-method'
import { logger } from '../../logger'
import { collections } from '../../database/collections'
import { uploadLogs } from '../upload-logs'
import { extractLogId } from '../extract-log-id'
import { fetchLog } from '../fetch-log'
import type { GameNumber } from '../../database/models/game.model'
import { environment } from '../../environment'
import { tasks } from '../../tasks'
import { games } from '../../games'
import { errors } from '../../errors'
import { logMessageQueue } from '../../games/log-message-queue'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    if (!environment.LOGS_TF_API_KEY) {
      logger.warn('logs.tf API key is missing, logs.tf integration disabled')
      return
    }

    events.on('match:ended', async ({ gameNumber }) => {
      if ((await configuration.get('games.logs_tf_upload_method')) !== LogsTfUploadMethod.backend) {
        logger.debug(`logs.tf upload method is not backend, skipping`)
        return
      }

      await tasks.schedule('logsTf:uploadLogs', secondsToMilliseconds(5), { gameNumber })
    })

    events.on('match/logs:uploaded', async ({ gameNumber, logsUrl }) => {
      const logId = extractLogId(logsUrl)
      if (!logId) return
      await tasks.schedule('logsTf:fetchLog', secondsToMilliseconds(30), { gameNumber, logId })
    })
  },
  {
    name: 'logs.tf integration',
  },
)

tasks.register('logsTf:fetchLog', async ({ gameNumber, logId }) => {
  const data = await fetchLog(logId)
  await collections.logsTfLogs.insertOne({ logId, gameNumber, fetchedAt: new Date(), data })
})

tasks.register('logsTf:uploadLogs', async ({ gameNumber }) => {
  const { logFile, map } = await getGameLogs(gameNumber)

  logger.info({ gameNumber }, 'uploading logs to logs.tf')
  const url = await uploadLogs({
    gameNumber,
    mapName: map,
    logFile: logFile,
  })
  logger.info({ gameNumber, url }, 'logs uploaded to logs.tf')
  await games.update(gameNumber, { $set: { logsUrl: url } })
})

async function getGameLogs(gameNumber: GameNumber): Promise<{ logFile: string; map: string }> {
  const game = await games.findOne({ number: gameNumber }, ['logSecret', 'map'])
  if (!game.logSecret) {
    throw errors.badRequest(`game is missing log secret: #${gameNumber}`)
  }

  // Wait for all pending log messages to be saved before fetching
  await logMessageQueue.waitForCompletion(game.logSecret)

  const gameLogs = await collections.gameLogs.findOne({
    logSecret: game.logSecret,
  })
  if (!gameLogs) {
    throw errors.notFound(`game logs not found for game #${gameNumber}`)
  }

  return {
    logFile: gameLogs.logs.map(line => `L ${line}`).join('\n'),
    map: game.map,
  }
}
