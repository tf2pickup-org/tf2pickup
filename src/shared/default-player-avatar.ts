import type { PlayerAvatar } from '../database/models/player.model'

// Steam's standard placeholder avatar, used when a player has no avatar stored
// (e.g. accounts Steam no longer returns a summary for, so the avatar backfill
// migration could not reach them). Keeps profile pages rendering instead of
// crashing on `avatar.large`.
const steamDefaultAvatarHash = 'fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb'
const steamAvatarBaseUrl = 'https://avatars.steamstatic.com'

export const defaultPlayerAvatar: PlayerAvatar = {
  small: `${steamAvatarBaseUrl}/${steamDefaultAvatarHash}.jpg`,
  medium: `${steamAvatarBaseUrl}/${steamDefaultAvatarHash}_medium.jpg`,
  large: `${steamAvatarBaseUrl}/${steamDefaultAvatarHash}_full.jpg`,
}
