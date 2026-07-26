import type { SteamId64 } from '../shared/types/steam-id-64'
import { events } from '../events'
import { update } from './update'
import type { PlayerBan } from '../database/models/player.model'
import { errors } from '../errors'
import { activityLog } from '../activity-log'

export async function revokeBan(props: {
  player: SteamId64
  banStart: Date
  actor: SteamId64
}): Promise<PlayerBan> {
  const after = await update(
    props.player,
    {
      $set: {
        'bans.$[ban].end': new Date(),
      },
    },
    {
      arrayFilters: [{ 'ban.start': { $eq: props.banStart } }],
    },
  )

  const ban = after.bans?.find(b => b.start.getTime() === props.banStart.getTime())
  if (!ban) {
    throw errors.notFound(`ban not found`)
  }

  events.emit('player/ban:revoked', { player: after.steamId, ban, admin: props.actor })
  await activityLog.record({
    type: 'ban revoked',
    player: after.steamId,
    actor: props.actor,
    reason: ban.reason,
  })
  return ban
}
