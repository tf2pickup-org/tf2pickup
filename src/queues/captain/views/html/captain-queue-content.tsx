import { requestContext } from '@fastify/request-context'
import type { QueueModel } from '../../../../database/models/queue.model'
import { gamemodeConfigs } from '../../../../gamemodes/configs'
import { PreReadyUpButton } from '../../../../pre-ready/views/html/pre-ready-up-button'
import { IsInQueue } from '../../../auto/views/html/is-in-queue'
import { QueueSwitcher } from '../../../auto/views/html/queue-switcher'
import { StreamList } from '../../../auto/views/html/stream-list'

// The captain queue's page frame: the same toolbar and sidebar as an auto queue, without
// Clear queue. The sign-up pool and the draft are not built yet.
export async function CaptainQueueContent(props: { queue: QueueModel }) {
  const { queue } = props
  const user = requestContext.get('user')
  const roles = gamemodeConfigs[queue.gamemode].captainRoles ?? []

  return (
    <div id="queue-content" class="tab-content max-lg:order-3 lg:contents!">
      <div class="queue-toolbar" id="queue-toolbar" tabindex="-1">
        <IsInQueue queue={queue._id} actor={user?.player.steamId} />
        <QueueSwitcher active={queue} actor={user?.player.steamId} />
        <div class="queue-state">
          <form ws-send class="queue-state-form">
            <h1 class="queue-player-count">
              Players 0/{roles.length * 2}
              <span class="ml-4">Roles 0/{roles.length}</span>
              <span class="ml-4">Captains 0/2</span>
            </h1>
            <div class="queue-state-actions">
              <PreReadyUpButton actor={user?.player.steamId} />
            </div>
          </form>
        </div>
      </div>
      <div class="queue-content">
        <StreamList />
      </div>
    </div>
  )
}
