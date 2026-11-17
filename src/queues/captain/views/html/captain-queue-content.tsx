import { requestContext } from '@fastify/request-context'
import type { QueueModel } from '../../../../database/models/queue.model'
import { players } from '../../../../players'
import { PreReadyUpButton } from '../../../../pre-ready/views/html/pre-ready-up-button'
import { IsInQueue } from '../../../auto/views/html/is-in-queue'
import { QueueSwitcher } from '../../../auto/views/html/queue-switcher'
import { StreamList } from '../../../auto/views/html/stream-list'
import { getPoolView } from '../../get-pool-view'
import { CaptainCounters } from './captain-counters'
import { CaptainPool } from './captain-pool'
import { CaptainReadyStatus } from './captain-ready-status'

// The captain queue's page frame: the same toolbar and sidebar as an auto queue, without
// Clear queue and the map vote.
export async function CaptainQueueContent(props: { queue: QueueModel }) {
  const { queue } = props
  const user = requestContext.get('user')
  const steamId = user?.player.steamId
  const [view, actor] = await Promise.all([
    getPoolView(queue),
    steamId
      ? players.bySteamId(steamId, [
          'steamId',
          'hasAcceptedRules',
          'bans',
          'activeGame',
          'skill',
          'verified',
        ])
      : undefined,
  ])

  return (
    <div id="queue-content" class="tab-content max-lg:order-3 lg:contents!">
      <div class="queue-toolbar" id="queue-toolbar" tabindex="-1">
        <IsInQueue queue={queue._id} actor={steamId} />
        <QueueSwitcher active={queue} actor={steamId} />
        <div class="queue-state">
          <div class="queue-state-form flex-wrap">
            <CaptainCounters queue={queue} view={view} />
            <form ws-send class="queue-state-actions">
              <PreReadyUpButton actor={steamId} />
            </form>
          </div>
        </div>
      </div>
      <div class="queue-content">
        <CaptainPool queue={queue} view={view} actor={actor} />
        <CaptainReadyStatus view={view} />
        <StreamList />
      </div>
    </div>
  )
}
