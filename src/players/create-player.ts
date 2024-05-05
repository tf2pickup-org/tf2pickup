import { collections } from '../database/collections'
import { PlayerModel } from '../database/models/player.model'
import { CreatePlayerParams } from './types/create-player-params'

export async function createPlayer({
  steamId,
  name,
  avatar,
}: CreatePlayerParams): Promise<PlayerModel> {
  const { insertedId } = await collections.players.insertOne({
    name,
    steamId,
    joinedAt: new Date(),
    avatar,
    roles: [],
    hasAcceptedRules: false,
    cooldownLevel: 0,
  })
  return (await collections.players.findOne(insertedId))!
}
