import { collections } from '../../database/collections'
import type { QueueId } from '../../database/models/queue.model'
import { QueueState } from '../../database/models/queue-state.model'
import { logger } from '../../logger'
import { preReady } from '../../pre-ready'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { queueCommand } from '../queue-command'
import { get } from '../get'
import { enterState } from './enter-state'

// An expired ready state leaves the queue waiting, even with a full pool: reopening ready-up there
// would loop without ever kicking the unready players.
export async function readyTimeout(queue: QueueId, token: string, phase: 'readyUp' | 'state') {
  const kicked = await queueCommand(
    'captain-ready-timeout',
    async emit => {
      const [settings, state] = await Promise.all([
        get(queue),
        collections.queueState.findOne({ queue }),
      ])
      // A task already claimed before cancellation may be waiting for the lock.
      // Its token must never affect a later ready-up, or the other launch mode.
      if (
        settings.launchMode !== 'captain' ||
        state?.state !== QueueState.ready ||
        state.captainReady?.token !== token
      )
        return [] as SteamId64[]

      if (phase === 'state') {
        await enterState(settings, QueueState.waiting, emit)
        return [] as SteamId64[]
      }

      const unready = await collections.captainPool
        .find({ queue, locked: false, ready: false })
        .toArray()
      await collections.captainPool.deleteMany({ queue, locked: false, ready: false })
      for (const { player } of unready) {
        logger.info({ queue, steamId: player.steamId }, 'captain ready up timeout, player kicked')
        emit('queue:playerKicked', { player: player.steamId })
      }
      emit('queue/captainPool:updated', { queue })
      return unready.map(member => member.player.steamId)
    },
    { reevaluate: phase === 'readyUp' },
  )
  for (const steamId of kicked) await preReady.cancel(steamId)
}
