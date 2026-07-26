import { configuration } from '../configuration'
import { collections } from '../database/collections'
import { QueueState } from '../database/models/queue-state.model'
import { errors } from '../errors'
import { events } from '../events'
import { logger } from '../logger'
import { isLaunchable as autoIsLaunchable } from '../queue-auto/is-launchable'
import { readyUpPreReadied as autoReadyUpPreReadied } from '../queue-auto/ready-up-pre-readied'
import { isLaunchable as captainIsLaunchable } from '../queue-captain/is-launchable'
import { readyUpPreReadied as captainReadyUpPreReadied } from '../queue-captain/ready-up-pre-readied'
import { withLogLevel } from '../utils/with-log-level'
import { withQueueLock } from './with-queue-lock'

export async function setState(state: QueueState) {
  await withQueueLock('set-state', async () => {
    logger.trace({ state }, 'queue.setState()')

    // Both guards below must run inside this lock: it is the same module-level
    // mutex that leave/kick/pick/banMap take, so checking here is the only way
    // to be atomic with respect to them.
    const mode = await configuration.get('queue.mode')

    if (state === QueueState.launching) {
      const launchable = await (mode === 'captain' ? captainIsLaunchable() : autoIsLaunchable())
      if (!launchable) {
        throw withLogLevel(
          errors.conflict('cannot launch: queue is no longer full and ready'),
          'warn',
        )
      }
    }

    await collections.queueState.updateOne({}, { $set: { state } })

    if (state === QueueState.ready) {
      await (mode === 'captain' ? captainReadyUpPreReadied() : autoReadyUpPreReadied())
    }

    events.emit('queue/state:updated', { state })
  })
}
