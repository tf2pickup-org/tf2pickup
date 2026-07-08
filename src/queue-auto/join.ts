import { collections } from '../database/collections'
import { configuration } from '../configuration'
import type { QueueSlotModel } from '../database/models/queue-slot.model'
import { QueueState } from '../database/models/queue-state.model'
import { errors } from '../errors'
import { events } from '../events'
import { logger } from '../logger'
import { players } from '../players'
import { preReady } from '../pre-ready'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { getState } from '../queue/get-state'
import { withLogLevel } from '../utils/with-log-level'
import { meetsSkillThreshold } from './meets-skill-threshold'
import { withQueueLock } from '../queue/with-queue-lock'
import type { QueueSlotId } from '../queue/types/queue-slot-id'
import { playerAvatarUrl } from '../shared/player-avatar-url'
import type { Gamemode } from '../shared/types/gamemode'

export async function join(
  gamemode: Gamemode,
  slotId: QueueSlotId,
  steamId: SteamId64,
): Promise<QueueSlotModel[]> {
  logger.trace({ steamId, gamemode, slotId }, `queue.join()`)
  const player = await players.bySteamId(steamId, [
    'hasAcceptedRules',
    'activeGame',
    'skill',
    'steamId',
    'name',
    'avatar.medium',
    'verified',
  ])

  if (!player.hasAcceptedRules) {
    throw errors.badRequest(`player has not accepted rules`)
  }

  if (player.activeGame) {
    throw errors.badRequest(`player has active game`)
  }

  if (await configuration.get('queue.require_player_verification')) {
    if (!player.verified) {
      throw errors.badRequest(`player is not verified`)
    }
  }

  const slot = await collections.queueSlots.findOne({ gamemode, id: slotId })
  if (!slot) {
    throw errors.notFound('no such slot')
  }

  if (!(await meetsSkillThreshold(player, slot))) {
    throw errors.badRequest(`player does not meet skill threshold`)
  }

  return await withQueueLock(gamemode, 'join', async () => {
    const state = await getState(gamemode)
    if (![QueueState.waiting, QueueState.ready].includes(state)) {
      throw withLogLevel(errors.badRequest('invalid queue state'), 'debug')
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

    // Enforce one queue at a time: vacate any slot this player still occupies,
    // including in another gamemode's queue.
    const oldSlot = await collections.queueSlots.findOneAndUpdate(
      {
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

    await collections.queueState.updateOne({ gamemode }, { $set: { last: player.steamId } })

    if (oldSlot && oldSlot.gamemode !== gamemode) {
      events.emit('queue/slots:updated', { gamemode: oldSlot.gamemode, slots: [oldSlot] })
      events.emit('queue/slots:updated', { gamemode, slots: [targetSlot] })
    } else {
      const slots = [oldSlot, targetSlot].filter(Boolean) as QueueSlotModel[]
      events.emit('queue/slots:updated', { gamemode, slots })
    }

    if (targetSlot.ready) {
      await preReady.start(steamId)
    }
    return [oldSlot, targetSlot].filter(Boolean) as QueueSlotModel[]
  })
}
