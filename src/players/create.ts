import { collections } from '../database/collections'
import type { PlayerModel } from '../database/models/player.model'
import { events } from '../events'
import type { CreatePlayerParams } from './types/create-player-params'

export async function create({ steamId, name, avatar }: CreatePlayerParams): Promise<PlayerModel> {
  const { insertedId } = await collections.players.insertOne({
    name,
    steamId,
    joinedAt: new Date(),
    avatar,
    roles: [],
    hasAcceptedRules: false,
    cooldownLevel: 0,
    preferences: {},
    stats: {
      totalGames: 0,
      gamesByClass: {},
    },
  })
  const player = (await collections.players.findOne({ _id: insertedId }))!
  events.emit('player:created', { steamId: player.steamId })
  return player
}
