import { addBan } from './add-ban'
import { bySteamId } from './by-steam-id'
import { getBanExpiryDate } from './get-ban-expiry-date'
import { getBansForPlayer, addBanForPlayer, revokeBanForPlayer } from './player-bans'
import { revokeBan } from './revoke-ban'
import { update } from './update'
import { upsert } from './upsert'

export const players = {
  addBan,
  bySteamId,
  getBanExpiryDate,
  getBansForPlayer,
  addBanForPlayer,
  revokeBanForPlayer,
  revokeBan,
  update,
  upsert,
} as const
