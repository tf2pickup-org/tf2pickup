import { groupBy } from 'es-toolkit'
import { collections } from '../../database/collections'
import type { QueueSlotModel } from '../../database/models/queue-slot.model'
import { logger } from '../../logger'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { kickFromQueue } from './kick-from-queue'
import { queueCommand } from './queue-command'

export async function kick(...steamIds: SteamId64[]): Promise<QueueSlotModel[]> {
  logger.trace({ steamIds }, 'queue.kick()')
  return await queueCommand('kick', async emit => {
    const occupied = await collections.queueSlots
      .find({ 'player.steamId': { $in: steamIds } })
      .toArray()
    const byQueue = groupBy(occupied, slot => slot.queue.toHexString())

    const kicked: QueueSlotModel[] = []
    for (const slots of Object.values(byQueue)) {
      const players = slots.map(({ player }) => player!.steamId)
      kicked.push(...(await kickFromQueue(slots[0]!.queue, players, emit)))
    }
    return kicked
  })
}
