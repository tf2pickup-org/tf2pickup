import { PlayerRole } from '../database/models/player.model'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { bySteamId } from './by-steam-id'

export async function isAdmin(steamId: SteamId64 | undefined): Promise<boolean> {
  if (!steamId) {
    return false
  }

  const player = await bySteamId(steamId, ['roles'])
  return player.roles.includes(PlayerRole.admin)
}
