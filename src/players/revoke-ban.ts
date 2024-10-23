import type { ObjectId } from 'mongodb'
import { collections } from '../database/collections'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { events } from '../events'

export async function revokeBan(banId: ObjectId, adminId: SteamId64) {
  let ban = await collections.playerBans.findOne({ _id: banId })
  if (!ban) {
    throw new Error(`ban not found: ${banId}`)
  }

  if (ban.end < new Date()) {
    throw new Error(`ban already expired: ${banId}`)
  }

  const after = (await collections.playerBans.findOneAndUpdate(
    { _id: banId },
    { $set: { end: new Date() } },
    {
      returnDocument: 'after',
    },
  ))!
  events.emit('player/ban:revoked', { ban: after, admin: adminId })
  return after
}
