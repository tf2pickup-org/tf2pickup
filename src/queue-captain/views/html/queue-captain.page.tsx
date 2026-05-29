import { requestContext } from '@fastify/request-context'
import { resolve } from 'path'
import { collections } from '../../../database/collections'
import { QueueState } from '../../../database/models/queue-state.model'
import { environment } from '../../../environment'
import { Footer } from '../../../html/components/footer'
import { GameClassIcon } from '../../../html/components/game-class-icon'
import { Layout } from '../../../html/layout'
import { NavigationBar } from '../../../html/components/navigation-bar'
import { Page } from '../../../html/components/page'
import { getState } from '../../../queue/get-state'
import { queueConfigs } from '../../../queue-auto/configs'
import { Announcements } from '../../../queue-auto/views/html/announcements'
import { BanAlerts } from '../../../queue-auto/views/html/ban-alerts'
import { OfflineAlert } from '../../../queue-auto/views/html/offline-alert'
import { RunningGameSnackbar } from '../../../queue-auto/views/html/running-game-snackbar'
import { Sidebar } from '../../../queue-auto/views/html/sidebar'
import { SubstitutionRequests } from '../../../queue-auto/views/html/substitution-requests'
import { players } from '../../../players'
import type { User } from '../../../auth/types/user'
import { CaptainClassColumn } from './captain-player-slot'
import { CaptainPlayerCount } from './captain-player-count'
import { DraftBoard } from './draft-board'
import { WantsCaptainToggle } from './wants-captain-toggle'

export async function QueueCaptainPage() {
  const user = requestContext.get('user')
  const state = await getState()
  const allPlayers = await collections.queuePlayers.find({}).toArray()
  const count = allPlayers.length

  return (
    <Layout
      title={`[${count}] ${environment.WEBSITE_NAME}`}
      description={`${environment.QUEUE_CONFIG} competitive pick-up games for everyone`}
      canonical="/"
      embedStyle={resolve(import.meta.dirname, 'style.css')}
    >
      <NavigationBar />
      <Page>
        <div class="container mx-auto grid grid-cols-1 gap-y-8 lg:grid-cols-4 lg:gap-x-4">
          <div class="order-1 grid grid-cols-1 gap-y-2 lg:col-span-4">
            <OfflineAlert />
            <BanAlerts actor={user?.player.steamId} />
            <SubstitutionRequests />
            <Announcements />
          </div>

          <div class="order-2 lg:col-span-3">
            <div class="flex flex-col gap-8">
              <QueueCaptainHeader user={user} playerCount={count} />
              <DraftBoard actor={user?.player.steamId} />
              {state !== QueueState.draft && <CaptainQueue user={user} state={state} />}
            </div>
          </div>

          <div class="order-last lg:order-3 lg:row-span-2">
            <Sidebar user={user} />
          </div>
        </div>
      </Page>
      <Footer />

      <div id="queue-notify-container" />
      <RunningGameSnackbar gameNumber={user?.player.activeGame} />
    </Layout>
  )
}

async function QueueCaptainHeader(props: { user?: User | undefined; playerCount: number }) {
  return (
    <div class="flex flex-col gap-2">
      <div class="flex flex-row items-center justify-center">
        <h3 class="text-ash flex-1 text-center text-2xl font-bold md:text-start">
          Players: <CaptainPlayerCount />
        </h3>
        <WantsCaptainToggle actor={props.user?.player.steamId} />
      </div>
      <div class="bg-abru-light-25 h-[2px] rounded-xs" />
    </div>
  )
}

async function CaptainQueue(props: { user?: User | undefined; state: QueueState }) {
  const config = queueConfigs[environment.QUEUE_CONFIG]
  const allPlayers = await collections.queuePlayers.find({}).toArray()

  const actor = props.user?.player.steamId
  const actorProfile = actor
    ? await players.bySteamId(actor, [
        'steamId',
        'bans',
        'activeGame',
        'verified',
        'hasAcceptedRules',
      ])
    : undefined

  const eligible = actorProfile
    ? !actorProfile.bans?.some(b => b.end > new Date()) &&
      !actorProfile.activeGame &&
      actorProfile.hasAcceptedRules
    : false

  const gridCols = config.classes.length > 4 ? 'xl:grid-cols-3' : 'xl:grid-cols-4'

  return (
    <form
      id="captain-queue"
      class={['grid grid-cols-1 gap-4 md:grid-cols-2', gridCols]}
      ws-send
      data-disable-when-offline
    >
      {config.classes.map(gc => (
        <div class="flex flex-col gap-4">
          <div class="flex flex-row items-center justify-center gap-2">
            <GameClassIcon gameClass={gc.name} size={32} />
            <span class="text-center text-2xl font-bold text-white">{gc.name}</span>
          </div>
          <div class="captain-class-column-wrapper">
            <CaptainClassColumn
              gameClass={gc.name}
              players={allPlayers}
              actor={eligible ? actor : undefined}
            />
          </div>
        </div>
      ))}
    </form>
  )
}
