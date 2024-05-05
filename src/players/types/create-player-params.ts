import { PlayerAvatar } from '../../database/models/player.model'
import { SteamId64 } from '../../shared/types/steam-id-64'

export interface CreatePlayerParams {
  steamId: SteamId64
  name: string
  avatar: PlayerAvatar
}
