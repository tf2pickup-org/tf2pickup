import type { GameModel } from '../database/models/game.model'
import { errors } from '../errors'
import { logger } from '../logger'
import { client } from './client'

export async function linkChannels(game: GameModel) {
  if (!client?.user) {
    return
  }

  const channelName = `${game.number}`
  const gameChannel = client.user.channel.subChannels.find(channel => channel.name === channelName)
  if (!gameChannel) {
    throw errors.badRequest('channel does not exist')
  }

  const [red, blu] = [
    gameChannel.subChannels.find(channel => channel.name?.toUpperCase() === 'RED'),
    gameChannel.subChannels.find(channel => channel.name?.toUpperCase() === 'BLU'),
  ]
  if (red && blu) {
    await red.link(blu)
    logger.info({ game }, `channels linked`)
  } else {
    throw errors.badRequest('BLU or RED subchannel does not exist')
  }
}
