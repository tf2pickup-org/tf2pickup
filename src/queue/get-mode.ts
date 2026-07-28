import { configuration } from '../configuration'
import type { QueueMode } from '../shared/types/queue-mode'

// Both modes' plugins are auto-loaded, so anything that renders the queue page has to check which
// one is actually running before it broadcasts.
export async function getMode(): Promise<QueueMode> {
  return await configuration.get('queue.mode')
}
