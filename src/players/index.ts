import { bySteamId } from './by-steam-id'
import { deletePlayer } from './delete-player'
import { findByName } from './find-by-name'
import { getBanExpiryDate } from './get-ban-expiry-date'
import { isAdmin } from './is-admin'
import { restrictions } from './restrictions'
import { setSkill } from './set-skill'
import { setVerified } from './set-verified'
import { update } from './update'
import { upsert } from './upsert'

export const players = {
  bySteamId,
  deletePlayer,
  findByName,
  getBanExpiryDate,
  isAdmin,
  restrictions,
  setSkill,
  setVerified,
  update,
  upsert,
} as const
