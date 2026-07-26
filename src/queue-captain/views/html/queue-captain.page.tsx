import { requestContext } from '@fastify/request-context'
import { resolve } from 'path'
import { collections } from '../../../database/collections'
import { QueueState } from '../../../database/models/queue-state.model'
import { environment } from '../../../environment'
import { getState } from '../../../queue/get-state'
import { queueConfigs } from '../../../queue-auto/configs'
import { ClearQueueButton } from '../../../queue/views/html/clear-queue-button'
import { QueuePageShell } from '../../../queue/views/html/queue-page-shell'
import { PreReadyUpButton } from '../../../pre-ready/views/html/pre-ready-up-button'
import type { User } from '../../../auth/types/user'
import { CaptainPlayerCount } from './captain-player-count'
import { CaptainQueueSection } from './captain-queue-section'
import { DraftBoard } from './draft-board'
import { IsInQueue } from './is-in-queue'
import { WantsCaptainToggle } from './wants-captain-toggle'

export async function QueueCaptainPage() {
  const user = requestContext.get('user')
  const state = await getState()
  const count = await collections.queuePlayers.countDocuments()
  const config = queueConfigs[environment.QUEUE_CONFIG]
  const required = config.teamCount * config.classes.reduce((sum, cls) => sum + cls.count, 0)

  return (
    <QueuePageShell
      count={count}
      required={required}
      embedStyle={resolve(import.meta.dirname, 'style.css')}
    >
      <IsInQueue actor={user?.player.steamId} />

      <div class="order-3 lg:order-2 lg:col-span-3">
        <div class="flex flex-col gap-8">
          <QueueCaptainHeader user={user} />
          <DraftBoard actor={user?.player.steamId} />
          {state !== QueueState.draft && <CaptainQueueSection actor={user?.player.steamId} />}
        </div>
      </div>
    </QueuePageShell>
  )
}

async function QueueCaptainHeader(props: { user?: User | undefined }) {
  return (
    <div class="flex flex-col gap-2">
      <form ws-send class="flex flex-row items-center justify-center">
        <h3 class="text-ash flex-1 text-center text-2xl font-bold max-lg:hidden md:text-start">
          Players: <CaptainPlayerCount />
        </h3>

        <div class="flex flex-row gap-2 max-lg:grow">
          <WantsCaptainToggle actor={props.user?.player.steamId} />
          <ClearQueueButton actor={props.user} />
          <PreReadyUpButton actor={props.user?.player.steamId} />
        </div>
      </form>
      <div class="bg-abru-light-25 h-[2px] rounded-xs max-lg:hidden"></div>
    </div>
  )
}
