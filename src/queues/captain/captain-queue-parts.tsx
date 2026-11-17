import type { QueueModel } from '../../database/models/queue.model'
import { IsInQueue } from '../auto/views/html/is-in-queue'
import { QueueSwitcher } from '../auto/views/html/queue-switcher'
import { SetTitle } from '../auto/views/html/set-title'
import { playerCounts } from '../player-counts'
import type { QueueParts } from '../page/queue-parts'
import type { Fragment } from '../page/send-to-pages'
import { getPoolView } from './get-pool-view'
import { CaptainCounters } from './views/html/captain-counters'
import { captainRoles } from './captain-roles'
import { CaptainPool } from './views/html/captain-pool'
import { CaptainReadyStatus } from './views/html/captain-ready-status'

// What a captain queue contributes to its page; slots, friends and the map vote don't exist here.
export async function captainQueueParts(queue: QueueModel, parts: QueueParts): Promise<Fragment[]> {
  const fragments: Fragment[] = []

  if (parts.captainPool || parts.slots) {
    const view = await getPoolView(queue)
    fragments.push(
      () => CaptainCounters({ queue, view }),
      () => CaptainReadyStatus({ view }),
      async ({ actor }) => CaptainPool.volunteers({ queue, view, actor: await actor() }),
      () => CaptainPool.bottleneck({ view }),
      ...captainRoles(queue.gamemode).map(
        (role): Fragment =>
          async ({ actor }) =>
            CaptainPool.roleColumn({ queue, view, role, actor: await actor() }),
      ),
    )
  }

  if (parts.counts) {
    const [title, { current }] = await Promise.all([SetTitle({ queue }), playerCounts(queue)])
    fragments.push(
      () => title,
      () => <span id="queue-current-player-count">{current}</span>,
    )
  }

  if (parts.membership) {
    fragments.push(
      ({ steamId }) => IsInQueue({ queue: queue._id, actor: steamId }),
      ({ steamId }) => QueueSwitcher({ active: queue, actor: steamId }),
    )
  }

  return fragments
}
