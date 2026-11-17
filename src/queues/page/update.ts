import type { QueueId } from '../../database/models/queue.model'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import type { Gateway } from '../../websocket/gateway'
import { get } from '../get'
import { QueueSwitcher } from '../auto/views/html/queue-switcher'
import { pageUrls } from './page-urls'
import { queuePageUrl } from './queue-page-url'
import { queueParts, type QueueParts } from './queue-parts'
import { sendToPages } from './send-to-pages'

// Pushes the given parts of a queue to the clients on its page.
export async function update(
  gateway: Gateway,
  queueId: QueueId,
  parts: QueueParts,
  options: { players?: SteamId64[] } = {},
) {
  const queue = await get(queueId)
  sendToPages(gateway, [queuePageUrl(queue.slug)], await queueParts(queue, parts), options.players)

  if (parts.counts && queue.launchMode === 'auto') {
    // every queue page shows this queue's count in the switcher
    const count = QueueSwitcher.count({ queue })
    sendToPages(gateway, await pageUrls(), [() => count], options.players)
  }
}
