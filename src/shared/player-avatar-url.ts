import type { PlayerAvatar } from '../database/models/player.model'
import { defaultPlayerAvatar } from './default-player-avatar'

// Resolve an avatar image URL, falling back to Steam's placeholder avatar when
// the player has no avatar stored. The model types `avatar` as required, but the
// database can hold documents without it (accounts Steam no longer returns a
// summary for, which the avatar backfill migration could not reach), so guarding
// here keeps profile pages from crashing on `avatar.large`.
export function playerAvatarUrl(
  avatar: Partial<PlayerAvatar> | undefined,
  size: keyof PlayerAvatar,
): string {
  return avatar?.[size] ?? defaultPlayerAvatar[size]
}
