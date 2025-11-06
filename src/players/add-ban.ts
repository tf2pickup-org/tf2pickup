import type { PlayerBan } from '../database/models/player.model'
import { events } from '../events'
import { isBot, type Bot } from '../shared/types/bot'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { bySteamId } from './by-steam-id'
import { update } from './update'

export async function addBan(props: {
  player: SteamId64
  admin: SteamId64 | Bot
  end: Date
  reason: string
}): Promise<PlayerBan> {
  const actor = isBot(props.admin) ? 'bot' : (await bySteamId(props.admin)).steamId
  const ban: PlayerBan = {
    actor,
    start: new Date(),
    end: props.end,
    reason: props.reason,
  }

  await update(props.player, { $push: { bans: ban } })
  events.emit('player/ban:added', { player: props.player, ban })
  return ban
}
