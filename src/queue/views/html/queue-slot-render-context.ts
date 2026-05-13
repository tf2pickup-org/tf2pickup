import { collections } from '../../../database/collections'
import type { PlayerModel } from '../../../database/models/player.model'
import type { QueueFriendshipModel } from '../../../database/models/queue-friendship.model'
import type { QueueSlotModel } from '../../../database/models/queue-slot.model'
import type { SteamId64 } from '../../../shared/types/steam-id-64'

type Actor =
  | Pick<PlayerModel, 'steamId' | 'bans' | 'activeGame' | 'skill' | 'verified' | 'roles'>
  | undefined

export interface QueueSlotRenderContext {
  actorSlot: QueueSlotModel | null
  friendshipsByTarget: Map<SteamId64, QueueFriendshipModel>
}

export async function createQueueSlotRenderContext(props: {
  slots: QueueSlotModel[]
  actor?: Actor
}): Promise<QueueSlotRenderContext | undefined> {
  if (!props.actor || !props.slots.some(slot => slot.player)) {
    return undefined
  }

  const targets = [
    ...new Set(
      props.slots
        .map(slot => slot.player?.steamId)
        .filter((steamId): steamId is SteamId64 => !!steamId),
    ),
  ]

  const [actorSlot, friendships] = await Promise.all([
    collections.queueSlots.findOne({ 'player.steamId': props.actor.steamId }),
    targets.length > 0
      ? collections.queueFriends.find({ target: { $in: targets } }).toArray()
      : Promise.resolve([]),
  ])

  return {
    actorSlot,
    friendshipsByTarget: new Map(friendships.map(friendship => [friendship.target, friendship])),
  }
}
