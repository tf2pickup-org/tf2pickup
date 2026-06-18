import type { PlayerAvatar } from '../database/models/player.model'

const steamDefaultAvatarHash = 'fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb'
const steamAvatarBaseUrl = 'https://avatars.steamstatic.com'

export const defaultPlayerAvatar: PlayerAvatar = {
  small: `${steamAvatarBaseUrl}/${steamDefaultAvatarHash}.jpg`,
  medium: `${steamAvatarBaseUrl}/${steamDefaultAvatarHash}_medium.jpg`,
  large: `${steamAvatarBaseUrl}/${steamDefaultAvatarHash}_full.jpg`,
}
