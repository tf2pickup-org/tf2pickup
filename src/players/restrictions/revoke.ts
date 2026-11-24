import type { SteamId64 } from '../../shared/types/steam-id-64'
import { events } from '../../events'
import { update } from '../update'
import type { PlayerBan } from '../../database/models/player.model'
import { errors } from '../../errors'
import { activityLog } from '../../activity-log'
import { restrictionField } from './restriction-field'
import type { RestrictionKind } from './restriction-kind'

export async function revoke(
  kind: RestrictionKind,
  props: { player: SteamId64; start: Date; actor: SteamId64 },
): Promise<PlayerBan> {
  const field = restrictionField[kind]
  const after = await update(
    props.player,
    {
      $set: {
        [`${field}.$[restriction].end`]: new Date(),
        ...(kind === 'ban' ? { 'bans.$[mirrored].revokedLocally': true } : {}),
      },
    },
    {
      arrayFilters: [
        { 'restriction.start': { $eq: props.start } },
        ...(kind === 'ban'
          ? [{ 'mirrored.start': { $eq: props.start }, 'mirrored.source': 'etf2l' }]
          : []),
      ],
    },
  )

  const restriction = after[field]?.find(r => r.start.getTime() === props.start.getTime())
  if (!restriction) {
    throw errors.notFound(`${kind === 'ban' ? 'ban' : 'chat mute'} not found`)
  }

  if (kind === 'ban') {
    events.emit('player/ban:revoked', {
      player: after.steamId,
      ban: restriction,
      admin: props.actor,
    })
  } else {
    events.emit('player/chatMute:revoked', {
      player: after.steamId,
      chatMute: restriction,
      admin: props.actor,
    })
  }
  await activityLog.record({
    type: kind === 'ban' ? 'ban revoked' : 'chat mute revoked',
    player: after.steamId,
    actor: props.actor,
    reason: restriction.reason,
  })
  return restriction
}
