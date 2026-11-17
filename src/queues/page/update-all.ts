import type { SteamId64 } from '../../shared/types/steam-id-64'
import type { Gateway } from '../../websocket/gateway'
import { listEnabled } from '../list-enabled'
import { queuePageUrl } from './queue-page-url'
import { queueParts, type QueueParts } from './queue-parts'
import { sharedParts, type SharedParts } from './shared-parts'
import { sendToPages } from './send-to-pages'

// Pushes the given parts to the clients on every queue page; queue parts go to each queue's own page.
export async function updateAll(
  gateway: Gateway,
  parts: SharedParts & Omit<QueueParts, 'counts'>,
  options: { players?: SteamId64[] } = {},
) {
  const enabled = await listEnabled()
  const urls = enabled.map(({ slug }) => queuePageUrl(slug))
  sendToPages(gateway, urls, sharedParts(parts), options.players)

  for (const queue of enabled) {
    sendToPages(
      gateway,
      [queuePageUrl(queue.slug)],
      await queueParts(queue, parts),
      options.players,
    )
  }
}
