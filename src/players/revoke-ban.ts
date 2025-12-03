import type { SteamId64 } from '../shared/types/steam-id-64'
import type { PlayerBan } from '../database/models/player.model'
import { revokeBanForPlayer } from './player-bans'

export async function revokeBan(props: {
  player: SteamId64
  banStart: Date
  admin: SteamId64
}): Promise<PlayerBan> {
  return await revokeBanForPlayer(props.player, props.banStart, props.admin)
}
