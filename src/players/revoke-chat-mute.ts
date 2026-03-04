import type { SteamId64 } from '../shared/types/steam-id-64'
import { events } from '../events'
import { update } from './update'
import type { PlayerBan } from '../database/models/player.model'
import { errors } from '../errors'

export async function revokeChatMute(props: {
  player: SteamId64
  muteStart: Date
  admin: SteamId64
}): Promise<PlayerBan> {
  const after = await update(
    props.player,
    {
      $set: {
        'chatMutes.$[mute].end': new Date(),
      },
    },
    {
      arrayFilters: [{ 'mute.start': { $eq: props.muteStart } }],
    },
  )

  const chatMute = after.chatMutes?.find(
    m => m.start.getTime() === props.muteStart.getTime(),
  )
  if (!chatMute) {
    throw errors.notFound(`chat mute not found`)
  }

  events.emit('player/chatMute:revoked', {
    player: after.steamId,
    chatMute,
    admin: props.admin,
  })
  return chatMute
}
