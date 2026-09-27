import type { QueueSlotModel } from '../../database/models/queue-slot.model'
import { preReady } from '../../pre-ready'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { queueCommand } from './queue-command'
import { vacateSlot } from './vacate-slot'

export async function leave(steamId: SteamId64): Promise<QueueSlotModel> {
  const slot = await queueCommand('leave', async emit => await vacateSlot(steamId, emit))
  await preReady.cancel(steamId)
  return slot
}
