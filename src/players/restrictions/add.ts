import type { PlayerBan } from '../../database/models/player.model'
import { events } from '../../events'
import { isBot, type Bot } from '../../shared/types/bot'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { bySteamId } from '../by-steam-id'
import { update } from '../update'
import { activityLog } from '../../activity-log'
import { restrictionField } from './restriction-field'
import type { RestrictionKind } from './restriction-kind'

export async function add(
  kind: RestrictionKind,
  props: {
    player: SteamId64
    actor: SteamId64 | Bot
    end: Date
    reason: string
    anonymous?: boolean
    start?: Date
    source?: PlayerBan['source']
  },
): Promise<PlayerBan> {
  const actor = isBot(props.actor) ? 'bot' : (await bySteamId(props.actor, ['steamId'])).steamId
  const restriction: PlayerBan = {
    actor,
    start: props.start ?? new Date(),
    end: props.end,
    reason: props.reason,
    ...(props.anonymous ? { anonymous: true } : {}),
    ...(props.source ? { source: props.source } : {}),
  }

  await update(props.player, { $push: { [restrictionField[kind]]: restriction } })
  await activityLog.record({
    type: kind === 'ban' ? 'ban added' : 'chat mute added',
    player: props.player,
    actor,
    reason: restriction.reason,
    start: restriction.start,
    end: restriction.end,
  })
  if (kind === 'ban') {
    events.emit('player/ban:added', { player: props.player, ban: restriction })
  } else {
    events.emit('player/chatMute:added', { player: props.player, chatMute: restriction })
  }
  return restriction
}
