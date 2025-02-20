import type { PlayerBan } from '../database/models/player.model'
import { events } from '../events'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { bySteamId } from './by-steam-id'
import { update } from './update'

export async function addBan(props: {
  player: SteamId64
  admin: SteamId64
  end: Date
  reason: string
}): Promise<PlayerBan> {
  const admin = await bySteamId(props.admin)
  const ban: PlayerBan = {
    actor: admin.steamId,
    start: new Date(),
    end: props.end,
    reason: props.reason,
  }

  await update(props.player, { $push: { bans: ban } })
  events.emit('player/ban:added', { player: props.player, ban })
  return ban
}
