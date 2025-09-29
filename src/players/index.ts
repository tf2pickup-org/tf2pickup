import { bySteamId } from './by-steam-id'
import { getPlayerGameCountOnClasses } from './get-player-game-count-on-classes'
import { update } from './update'
import { upsert } from './upsert'

export const players = {
  bySteamId,
  getPlayerGameCountOnClass: getPlayerGameCountOnClasses,
  update,
  upsert,
} as const
