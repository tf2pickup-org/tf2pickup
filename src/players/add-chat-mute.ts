import type { PlayerBan } from '../database/models/player.model'
import { events } from '../events'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { update } from './update'
import { activityLog } from '../activity-log'

export async function addChatMute(props: {
  player: SteamId64
  admin: SteamId64
  end: Date
  reason: string
}): Promise<PlayerBan> {
  const chatMute: PlayerBan = {
    actor: props.admin,
    start: new Date(),
    end: props.end,
    reason: props.reason,
  }

  await update(props.player, { $push: { chatMutes: chatMute } })
  await activityLog.record({
    type: 'chat mute added',
    player: props.player,
    actor: props.admin,
    reason: chatMute.reason,
    start: chatMute.start,
    end: chatMute.end,
  })
  events.emit('player/chatMute:added', { player: props.player, chatMute })
  return chatMute
}
