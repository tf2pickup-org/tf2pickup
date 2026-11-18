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
import { CaptainMapBans } from './views/html/captain-map-bans'
import { CaptainActions } from './views/html/captain-actions'
import { CaptainDraft } from './views/html/captain-draft'
import { CaptainPool } from './views/html/captain-pool'
import { CaptainReadyStatus } from './views/html/captain-ready-status'

// What a captain queue contributes to its page; slots, friends and the map vote don't exist here.
export async function captainQueueParts(queue: QueueModel, parts: QueueParts): Promise<Fragment[]> {
  const fragments: Fragment[] = []

  const stage = !!parts.captainStage || !!parts.slots
  const draft = !!parts.captainDraft || stage
  if (parts.captainPool || parts.slots || draft) {
    const view = await getPoolView(queue)
    if (parts.captainPool || parts.slots) {
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

    if (stage) {
      fragments.push(
        ({ steamId }) => CaptainActions({ view, viewer: steamId }),
        ({ steamId }) => CaptainDraft.skeleton({ queue, view, viewer: steamId }),
      )
    }
    if (draft) {
      fragments.push(({ steamId }) => CaptainDraft.nextGame({ view, viewer: steamId }))
      if (view.draft) {
        fragments.push(
          ({ steamId }) => CaptainDraft.status({ queue, view, viewer: steamId }),
          ({ steamId }) => CaptainMapBans({ view, viewer: steamId }),
          ({ steamId }) => CaptainDraft.board({ queue, view, viewer: steamId }),
          ...captainRoles(queue.gamemode).map(
            (role): Fragment =>
              ({ steamId }) =>
                CaptainDraft.roleColumn({ queue, view, role, viewer: steamId }),
          ),
        )
      }
    }
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
