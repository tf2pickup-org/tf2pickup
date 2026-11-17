import { collections } from '../../database/collections'
import { QueueState } from '../../database/models/queue-state.model'
import type { AppWebSocket } from '../../websocket/types'
import { getState } from '../get-state'
import { ReadyUpDialog } from '../auto/views/html/ready-up-dialog'
import { IsInQueue } from '../auto/views/html/is-in-queue'
import { byPageUrl } from './by-page-url'
import { fetchActors } from './fetch-actors'
import { queueParts } from './queue-parts'
import { renderFragments } from './render-fragments'
import { sharedParts } from './shared-parts'

// Brings a client that just opened a queue page up to date. Switching from another queue's page
// keeps the shared part of the page.
export async function render(socket: AppWebSocket, previousUrl?: string) {
  const queue = await byPageUrl(socket.currentUrl)
  if (!queue) {
    return
  }

  const fragments = await queueParts(queue, { slots: 'all', counts: true })
  // a preloaded queue page may be stale on who is in the queue
  fragments.push(({ steamId }) => IsInQueue({ queue: queue._id, actor: steamId }))
  if (!(await byPageUrl(previousUrl))) {
    fragments.push(
      ...sharedParts({
        substitutionRequests: true,
        onlinePlayers: true,
        streams: true,
        chat: 'all',
        runningGame: true,
        preReady: true,
        banAlerts: true,
      }),
    )
  }

  const steamId = socket.player?.steamId
  const actor = steamId ? (await fetchActors([steamId])).get(steamId) : undefined
  for (const html of await renderFragments(fragments, {
    steamId,
    actor: () => Promise.resolve(actor),
  })) {
    socket.send(html)
  }

  if (steamId && (await getState(queue._id)) === QueueState.ready) {
    const unready = await collections.queueSlots.findOne({
      queue: queue._id,
      'player.steamId': steamId,
      ready: false,
    })
    if (unready) {
      socket.send(await ReadyUpDialog.show(steamId))
    }
  }
}
