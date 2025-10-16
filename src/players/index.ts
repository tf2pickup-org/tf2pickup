import { addBan } from './add-ban'
import { bySteamId } from './by-steam-id'
import { getBanExpiryDate } from './get-ban-expiry-date'
import { getPlayerGameCountOnClasses } from './get-player-game-count-on-classes'
import { revokeBan } from './revoke-ban'
import { update } from './update'
import { upsert } from './upsert'

export const players = {
  addBan,
  bySteamId,
  getBanExpiryDate,
  getPlayerGameCountOnClass: getPlayerGameCountOnClasses,
  revokeBan,
  update,
  upsert,
} as const
