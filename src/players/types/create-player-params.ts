import type { PlayerAvatar, PlayerRole } from '../../database/models/player.model'
import type { SteamId64 } from '../../shared/types/steam-id-64'

export interface CreatePlayerParams {
  steamId: SteamId64
  name: string
  avatar: PlayerAvatar
  roles?: PlayerRole[]
}
