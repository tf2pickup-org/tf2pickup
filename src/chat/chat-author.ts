import type { ChatMessageAuthor } from '../database/models/chat-message.model'
import { PlayerRole, type PlayerModel } from '../database/models/player.model'

export function chatAuthor(
  player: Pick<PlayerModel, 'steamId' | 'name' | 'roles'>,
): ChatMessageAuthor {
  return {
    steamId: player.steamId,
    name: player.name,
    admin: player.roles.includes(PlayerRole.admin),
  }
}
