import type { QueueModel } from '../../database/models/queue.model'
import { IsInQueue } from '../views/html/is-in-queue'
import { QueueSwitcher } from '../views/html/queue-switcher'
import { SetTitle } from '../views/html/set-title'
import { playerCounts } from '../player-counts'
import type { QueueParts } from '../page/queue-parts'
import type { Fragment } from '../page/send-to-pages'
import { getPoolView } from './get-pool-view'
import { CaptainCounters } from './views/html/captain-counters'
import { captainRoles } from './captain-roles'
import { CaptainActions } from './views/html/captain-actions'
import { CaptainDraft } from './views/html/captain-draft'
import { CaptainPool } from './views/html/captain-pool'
import { CaptainReadyStatus } from './views/html/captain-ready-status'

// What a captain queue contributes to its page; slots, friends and the map vote don't exist here.
export async function captainQueueParts(queue: QueueModel, parts: QueueParts): Promise<Fragment[]> {
  const fragments: Fragment[] = []

  const pool = !!parts.captainPool || !!parts.slots
  const stage = !!parts.captainStage || !!parts.slots
  // the draft frame holds the places its parts swap into, so it travels as a whole
  const draft = !!parts.captainDraft || stage
  // the toolbar's own controls: the pre-ready button and, while a draft runs, cancel
  const toolbar = stage || !!parts.preReady

  if (pool || draft || toolbar) {
    const view = await getPoolView(queue)

    if (pool) {
      fragments.push(
        () => CaptainCounters({ queue, view }),
        () => CaptainReadyStatus({ view }),
        async ({ actor }) => CaptainPool.volunteers({ queue, view, actor: await actor() }),
        ...captainRoles(queue.gamemode).map(
          (role): Fragment =>
            async ({ actor }) =>
              CaptainPool.roleColumn({ queue, view, role, actor: await actor() }),
        ),
      )
    }

    if (toolbar) {
      // the toolbar holds the pre-ready button, so an update touching it re-renders it whole
      fragments.push(({ steamId }) => CaptainActions({ view, viewer: steamId }))
    }

    if (draft) {
      fragments.push(
        ({ steamId }) => CaptainDraft({ queue, view, viewer: steamId }),
        ({ steamId }) => CaptainDraft.nextGame({ view, viewer: steamId }),
      )
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
