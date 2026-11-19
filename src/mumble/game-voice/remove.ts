import { minutesToMilliseconds } from 'date-fns'
import type { GameNumber } from '../../database/models/game.model'
import { logger } from '../../logger'
import { tasks } from '../../tasks'
import { findGameChannel } from './find-game-channel'
import { mumbleVoiceServer } from './mumble-voice-server'

export async function remove(gameNumber: GameNumber) {
  if (!(await mumbleVoiceServer.gamesChannel())) {
    throw new Error(`mumble client not connected`)
  }

  const channel = await findGameChannel(gameNumber)
  if (!channel) {
    logger.debug({ gameNumber }, 'mumble channel already removed')
    return
  }

  const userCount = channel.subChannels.reduce((sum, c) => sum + c.userCount, channel.userCount)
  if (userCount > 0) {
    logger.debug({ gameNumber, userCount }, `mumble channel not empty yet; not removing`)
    await tasks.schedule('mumble.cleanupChannel', minutesToMilliseconds(1), { gameNumber })
    return
  }

  await channel.remove()
  logger.info({ gameNumber }, 'mumble channel removed')
}
