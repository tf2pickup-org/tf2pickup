import type { GameNumber } from '../database/models/game.model'
import { Tf2Team } from '../shared/types/tf2-team'
import { client } from './client'
import { findTargetChannel } from './find-target-channel'

export async function findGameChannels(gameNumber: GameNumber) {
  const gamesChannel = client && (await findTargetChannel(client))
  const game = gamesChannel?.subChannels.find(({ name }) => name === `${gameNumber}`)
  const team = (name: Tf2Team) =>
    game?.subChannels.find(channel => channel.name?.toUpperCase() === name.toUpperCase())
  const [blu, red] = [team(Tf2Team.blu), team(Tf2Team.red)]
  return game && blu && red ? { game, [Tf2Team.blu]: blu, [Tf2Team.red]: red } : undefined
}
