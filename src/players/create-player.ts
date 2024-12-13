import { collections } from '../database/collections'
import type { PlayerModel } from '../database/models/player.model'
import type { CreatePlayerParams } from './types/create-player-params'

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
    preferences: {},
  })
  return (await collections.players.findOne({ _id: insertedId }))!
}
