import { bySteamId } from './by-steam-id'
import { getPlayerGameCountOnClass } from './get-player-game-count-on-class'
import { update } from './update'

export const players = {
  bySteamId,
  getPlayerGameCountOnClass,
  update,
} as const
