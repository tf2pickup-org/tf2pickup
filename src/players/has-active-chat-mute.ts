import type { PlayerModel } from '../database/models/player.model'

export function hasActiveChatMute(
  player: Pick<PlayerModel, 'chatMutes'>,
): boolean {
  return (player.chatMutes ?? []).some(mute => mute.end > new Date())
}
