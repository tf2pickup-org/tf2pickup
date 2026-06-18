import type { PlayerAvatar } from '../database/models/player.model'
import { defaultPlayerAvatar } from './default-player-avatar'

export function playerAvatarUrl(
  avatar: Partial<PlayerAvatar> | undefined,
  size: keyof PlayerAvatar,
): string {
  return avatar?.[size] ?? defaultPlayerAvatar[size]
}
