import type { PlayerBan } from '../database/models/player.model'
import { events } from '../events'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { bySteamId } from './by-steam-id'
import { update } from './update'

export async function addChatMute(props: {
  player: SteamId64
  admin: SteamId64
  end: Date
  reason: string
}): Promise<PlayerBan> {
  const actor = (await bySteamId(props.admin, ['steamId'])).steamId
  const chatMute: PlayerBan = {
    actor,
    start: new Date(),
    end: props.end,
    reason: props.reason,
  }

  await update(props.player, { $push: { chatMutes: chatMute } })
  events.emit('player/chatMute:added', { player: props.player, chatMute })
  return chatMute
}
