import { collections } from '../database/collections'
import type { QueueSlotModel } from '../database/models/queue-slot.model'
import { QueueState } from '../database/models/queue-state.model'
import { events } from '../events'
import { logger } from '../logger'
import type { SteamId64 } from '../shared/types/steam-id-64'
import type { Gamemode } from '../shared/types/gamemode'
import { getMapVoteResults } from './get-map-vote-results'
import { getState } from '../queue/get-state'
import { withQueueLock } from '../queue/with-queue-lock'
import { preReady } from '../pre-ready'
import { errors } from '../errors'
import { withLogLevel } from '../utils/with-log-level'

export async function kick(...steamIds: SteamId64[]): Promise<QueueSlotModel[]> {
  logger.trace({ steamIds }, 'queue.kick()')

  // A player is only ever in one queue at a time, but the given players may
  // belong to different gamemodes' queues, so kick each queue under its own lock.
  const occupied = await collections.queueSlots
    .find({ 'player.steamId': { $in: steamIds } })
    .toArray()
  const byGamemode = new Map<Gamemode, SteamId64[]>()
  for (const slot of occupied) {
    const ids = byGamemode.get(slot.gamemode) ?? []
    ids.push(slot.player!.steamId)
    byGamemode.set(slot.gamemode, ids)
  }

  const kicked: QueueSlotModel[] = []
  for (const [gamemode, ids] of byGamemode) {
    kicked.push(...(await kickFromGamemode(gamemode, ids)))
  }
  return kicked
}

async function kickFromGamemode(
  gamemode: Gamemode,
  steamIds: SteamId64[],
): Promise<QueueSlotModel[]> {
  return await withQueueLock(gamemode, 'kick', async () => {
    const state = await getState(gamemode)
    if (state === QueueState.launching) {
      throw withLogLevel(errors.badRequest('invalid queue state'), 'debug')
    }

    const slots: QueueSlotModel[] = []
    for (const steamId of steamIds) {
      const slot = await collections.queueSlots.findOneAndUpdate(
        {
          gamemode,
          'player.steamId': steamId,
        },
        {
          $set: { player: null, ready: false },
        },
        {
          returnDocument: 'after',
        },
      )

      if (!slot) {
        continue
      }

      events.emit('queue:playerKicked', { player: steamId })
      slots.push(slot)
    }

    if (slots.length > 0) {
      events.emit('queue/slots:updated', { gamemode, slots })
      await collections.queueMapVotes.deleteMany({ gamemode, player: { $in: steamIds } })
      events.emit('queue/mapVoteResults:updated', {
        gamemode,
        results: await getMapVoteResults(gamemode),
      })
      for (const steamId of steamIds) {
        await preReady.cancel(steamId)
      }
    }

    return slots
  })
}
