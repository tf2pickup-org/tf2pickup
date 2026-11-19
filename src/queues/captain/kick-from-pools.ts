import { collections } from '../../database/collections'
import { logger } from '../../logger'
import { preReady } from '../../pre-ready'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { queueCommand } from '../queue-command'

// Drops the given players from every captain pool. Locked draft members stay: nothing but a
// captain's cancel ends a draft (SPEC 4.7).
export async function kickFromPools(...steamIds: SteamId64[]) {
  const entries = await collections.captainPool
    .find({ 'player.steamId': { $in: steamIds }, locked: false })
    .toArray()
  if (entries.length === 0) {
    return
  }

  await queueCommand('captain-kick', async emit => {
    const kicked = await collections.captainPool
      .find({
        'player.steamId': { $in: steamIds },
        locked: false,
      })
      .toArray()
    for (const { queue, player } of kicked) {
      await collections.captainPool.deleteOne({ queue, 'player.steamId': player.steamId })
      logger.info({ queue, steamId: player.steamId }, 'captain pool kicked')
      emit('queue:playerKicked', { player: player.steamId })
      emit('queue/captainPool:updated', { queue })
    }
  })
  for (const steamId of steamIds) {
    await preReady.cancel(steamId)
  }
}
