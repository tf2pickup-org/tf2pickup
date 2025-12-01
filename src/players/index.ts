import { addBan } from './add-ban'
import { bySteamId } from './by-steam-id'
import { getBanExpiryDate } from './get-ban-expiry-date'
import { revokeBan } from './revoke-ban'
import { update } from './update'
import { upsert } from './upsert'
import { synchronizeEtf2lProfiles } from './synchronize-etf2l-profiles'

export const players = {
  addBan,
  bySteamId,
  getBanExpiryDate,
  revokeBan,
  update,
  upsert,
  synchronizeEtf2lProfiles,
} as const
