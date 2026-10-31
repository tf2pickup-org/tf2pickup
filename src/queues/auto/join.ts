import { configuration } from '../../configuration'
import { collections } from '../../database/collections'
import type { QueueId } from '../../database/models/queue.model'
import type { QueueSlotModel } from '../../database/models/queue-slot.model'
import { QueueState } from '../../database/models/queue-state.model'
import { errors } from '../../errors'
import { logger } from '../../logger'
import { players } from '../../players'
import { preReady } from '../../pre-ready'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { getState } from '../get-state'
import { withLogLevel } from '../../utils/with-log-level'
import { joinBlocker } from './join-blocker'
import { queueCommand } from './queue-command'
import type { QueueSlotId } from '../types/queue-slot-id'
import { playerAvatarUrl } from '../../shared/player-avatar-url'
import { get } from '../get'
import { vacateSlot } from './vacate-slot'

export async function join(
  queue: QueueId,
  slotId: QueueSlotId,
  steamId: SteamId64,
): Promise<QueueSlotModel[]> {
  logger.trace({ queue, steamId, slotId }, `queue.join()`)
  const settings = await get(queue)
  const player = await players.bySteamId(steamId, [
    'hasAcceptedRules',
    'bans',
    'activeGame',
    'skill',
    'steamId',
    'name',
    'avatar.medium',
    'verified',
  ])

  const slot = await collections.queueSlots.findOne({ queue, id: slotId })
  if (!slot) {
    throw errors.notFound('no such slot')
  }

  const defaultSkill = (await configuration.get('games.default_player_skill'))[settings.gamemode]
  const blocker = joinBlocker(player, slot, settings, defaultSkill)
  if (blocker) {
    throw errors.badRequest(blocker)
  }

  return await queueCommand('join', async emit => {
    const state = await getState(queue)
    if (![QueueState.waiting, QueueState.ready].includes(state)) {
      throw withLogLevel(errors.badRequest('invalid queue state'), 'debug')
    }

    // checked before leaving another queue, so a taken slot doesn't cost the player theirs
    if ((await collections.queueSlots.findOne({ _id: slot._id }))?.player) {
      throw withLogLevel(errors.badRequest('slot occupied'), 'debug')
    }

    // a player is in at most one queue at a time
    if (
      await collections.queueSlots.countDocuments({
        queue: { $ne: queue },
        'player.steamId': steamId,
      })
    ) {
      await vacateSlot(steamId, emit)
    }

    const targetSlot = await collections.queueSlots.findOneAndUpdate(
      { _id: slot._id, player: null },
      {
        $set: {
          player: {
            steamId: player.steamId,
            name: player.name,
            avatarUrl: playerAvatarUrl(player.avatar, 'medium'),
          },
          ready: state === QueueState.ready,
        },
      },
      {
        returnDocument: 'after',
      },
    )

    if (!targetSlot) {
      throw withLogLevel(errors.badRequest('slot occupied'), 'debug')
    }

    const oldSlot = await collections.queueSlots.findOneAndUpdate(
      {
        queue,
        'player.steamId': player.steamId,
        _id: { $ne: targetSlot._id },
      },
      {
        $set: { player: null, ready: false },
      },
      {
        returnDocument: 'after',
      },
    )

    await collections.queueState.updateOne({ queue }, { $set: { last: player.steamId } })

    const slots = [oldSlot, targetSlot].filter(Boolean) as QueueSlotModel[]
    emit('queue/slots:updated', { queue, slots })

    if (targetSlot.ready) {
      await preReady.start(steamId)
    }
    return slots
  })
}
