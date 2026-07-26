import { configuration } from '../configuration'
import type { Configuration } from '../database/models/configuration-entry.model'
import { events } from '../events'

type QueueMode = Configuration['queue.mode']

/**
 * Tracks whether the given queue mode is the active one.
 *
 * The result is cached and refreshed from `queue/mode:changed` rather than read
 * per call: `configuration.get()` hits the database every time, and the plugins
 * using this check on every websocket message and every disconnect.
 */
export async function watchMode(mode: QueueMode): Promise<() => boolean> {
  let isActive = (await configuration.get('queue.mode')) === mode

  events.on('queue/mode:changed', ({ mode: newMode }) => {
    isActive = newMode === mode
  })

  return () => isActive
}
