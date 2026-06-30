import { collections } from '../database/collections'
import type { QueueSlotModel } from '../database/models/queue-slot.model'
import { events } from '../events'
import { logger } from '../logger'
import type { Gamemode } from '../shared/types/gamemode'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { withQueueLock } from '../queue/with-queue-lock'

export async function unready(...steamIds: SteamId64[]): Promise<QueueSlotModel[]> {
  logger.trace({ steamIds }, 'queue.unready()')
  if (steamIds.length === 0) {
    return []
  }

  const occupied = await collections.queueSlots
    .find({ 'player.steamId': { $in: steamIds } })
    .toArray()
  const byGamemode = new Map<Gamemode, SteamId64[]>()
  for (const slot of occupied) {
    const steamId = slot.player!.steamId
    byGamemode.set(slot.gamemode, [...(byGamemode.get(slot.gamemode) ?? []), steamId])
  }

  const updated: QueueSlotModel[] = []
  for (const [gamemode, ids] of byGamemode) {
    updated.push(...(await unreadyInGamemode(gamemode, ids)))
  }
  return updated
}

async function unreadyInGamemode(
  gamemode: Gamemode,
  steamIds: SteamId64[],
): Promise<QueueSlotModel[]> {
  return await withQueueLock(gamemode, 'unready', async () => {
    const slots: QueueSlotModel[] = []
    for (const steamId of steamIds) {
      const slot = await collections.queueSlots.findOneAndUpdate(
        {
          gamemode,
          'player.steamId': steamId,
        },
        {
          $set: { ready: false },
        },
        {
          returnDocument: 'after',
        },
      )

      if (!slot) {
        continue
      }

      slots.push(slot)
    }

    if (slots.length > 0) {
      events.emit('queue/slots:updated', { gamemode, slots })
    }

    return slots
  })
}
