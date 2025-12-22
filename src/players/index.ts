import { addBan } from './add-ban'
import { bySteamId } from './by-steam-id'
import { getBanExpiryDate } from './get-ban-expiry-date'
import { revokeBan } from './revoke-ban'
import { setSkill } from './set-skill'
import { update } from './update'
import { upsert } from './upsert'

export const players = {
  addBan,
  bySteamId,
  getBanExpiryDate,
  revokeBan,
  setSkill,
  update,
  upsert,
} as const
