import { collections } from '../database/collections'
import type { PlayerBanModel } from '../database/models/player-ban.model'
import { events } from '../events'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { PlayerNotFoundError } from './errors'

export async function addBan(props: {
  player: SteamId64
  admin: SteamId64
  end: Date
  reason: string
}): Promise<PlayerBanModel> {
  const player = await collections.players.findOne({ steamId: props.player })
  if (!player) {
    throw new PlayerNotFoundError(props.player)
  }

  const admin = await collections.players.findOne({ steamId: props.admin })
  if (!admin) {
    throw new PlayerNotFoundError(props.admin)
  }

  const { insertedId } = await collections.playerBans.insertOne({
    player: player._id,
    admin: admin._id,
    start: new Date(),
    end: props.end,
    reason: props.reason,
  })
  const ban = (await collections.playerBans.findOne({ _id: insertedId }))!
  events.emit('player/ban:added', { ban })
  return ban
}
