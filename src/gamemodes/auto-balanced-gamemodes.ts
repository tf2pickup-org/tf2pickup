import { Gamemode } from '../shared/types/gamemode'
import { gamemodeConfigs } from './configs'

// The gamemodes players have a skill in.
export const autoBalancedGamemodes = Object.values(Gamemode).filter(
  gamemode => gamemodeConfigs[gamemode].autoBalance,
)
