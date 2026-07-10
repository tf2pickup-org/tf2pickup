import { collections } from '../../../database/collections'
import { Layout } from '../../../html/layout'
import { NavigationBar } from '../../../html/components/navigation-bar'
import { QueueSlot } from './queue-slot'
import { resolve } from 'path'
import { getQueueConfig } from '../../configs'
import { queuePageUrl } from '../../queue-page-url'
import { GameClassIcon } from '../../../html/components/game-class-icon'
import { Page } from '../../../html/components/page'
import type { User } from '../../../auth/types/user'
import { environment } from '../../../environment'
import { enabledGamemodes } from '../../../shared/enabled-gamemodes'
import { RunningGameSnackbar } from './running-game-snackbar'
import { MapVote } from './map-vote'
import { OfflineAlert } from './offline-alert'
import { SoundBlockedAlert } from './sound-blocked-alert'
import { Footer } from '../../../html/components/footer'
import type { QueueSlotModel } from '../../../database/models/queue-slot.model'
import type { SteamId64 } from '../../../shared/types/steam-id-64'
import { RequestNotificationPermissions } from './request-notification-permissions'
import { SubstitutionRequests } from './substitution-requests'
import { StreamList } from './stream-list'
import { BanAlerts } from './ban-alerts'
import { AcceptRulesDialog } from './accept-rules-dialog'
import { CurrentPlayerCount } from './current-player-count'
import { PreReadyUpButton } from '../../../pre-ready/views/html/pre-ready-up-button'
import { Sidebar } from './sidebar'
import { IsInQueue } from './is-in-queue'
import { MapVoteSelection } from './map-vote-selection'
import { requestContext } from '@fastify/request-context'
import { Announcements } from './announcements'
import { PlayerRole } from '../../../database/models/player.model'
import { IconEraser } from '../../../html/components/icons'
import { players } from '../../../players'
import type { Gamemode } from '../../../shared/types/gamemode'
import { GamemodeSelector } from './gamemode-selector'

export async function QueuePage(props: { gamemode: Gamemode }) {
  const { gamemode } = props
  const slots = await collections.queueSlots.find({ gamemode }).toArray()
  const current = slots.filter(slots => Boolean(slots.player)).length
  const required = slots.length
  const user = requestContext.get('user')

  return (
    <Layout
      title={`[${current}/${required}] ${environment.WEBSITE_NAME}`}
      description={`${enabledGamemodes.join(', ')} competitive pick-up games for everyone`}
      canonical={queuePageUrl(gamemode)}
      embedStyle={resolve(import.meta.dirname, 'style.css')}
    >
      <NavigationBar />
      <Page>
        <IsInQueue actor={user?.player.steamId} />
        <MapVoteSelection actor={user?.player.steamId} />
        <div class="container mx-auto grid grid-cols-1 gap-y-8 lg:grid-cols-4 lg:gap-x-4">
          <div class="order-1 grid grid-cols-1 gap-y-2 lg:col-span-4">
            <OfflineAlert />
            {!!user && <RequestNotificationPermissions />}
            {!!user && <SoundBlockedAlert />}
            <BanAlerts actor={user?.player.steamId} />
            <SubstitutionRequests />
            <Announcements />
            <GamemodeSelector active={gamemode} />
          </div>

          <div class="order-2 lg:order-3 lg:row-span-2">
            <Sidebar user={user} gamemode={gamemode} required={required} />
          </div>

          <div id="queue-content" class="tab-content lg:contents!">
            <div class="order-3 lg:order-2 lg:col-span-3">
              <div class="flex flex-col gap-8">
                <QueueState actor={user} gamemode={gamemode} required={required} />
                <Queue slots={slots} gamemode={gamemode} actor={user?.player.steamId} />
              </div>
            </div>

            <div class="order-4 lg:col-span-3">
              <MapVote gamemode={gamemode} actor={user?.player.steamId} />
            </div>

            <div class="order-5 lg:col-span-4">
              <StreamList />
            </div>
          </div>
        </div>
      </Page>
      <Footer />

      <div id="queue-notify-container"></div>
      <RunningGameSnackbar gameNumber={user?.player.activeGame} />
      <AcceptRulesDialog actor={user} />
    </Layout>
  )
}

async function QueueState(props: {
  actor?: User | undefined
  gamemode: Gamemode
  required: number
}) {
  return (
    <div class="flex flex-col gap-2">
      <form ws-send class="flex flex-row items-center justify-center">
        <h3 class="text-ash flex-1 text-center text-2xl font-bold max-lg:hidden md:text-start">
          Players: <CurrentPlayerCount gamemode={props.gamemode} />/{props.required}
        </h3>

        <div class="flex flex-row gap-2 max-lg:grow">
          <ClearQueueButton actor={props.actor} gamemode={props.gamemode} />
          <PreReadyUpButton actor={props.actor?.player.steamId} />
        </div>
      </form>
      <div class="bg-abru-light-25 h-[2px] rounded-xs max-lg:hidden"></div>
    </div>
  )
}

async function Queue(props: {
  slots: QueueSlotModel[]
  gamemode: Gamemode
  actor?: SteamId64 | undefined
}) {
  const config = getQueueConfig(props.gamemode)
  const gridCols =
    config.classes.length > 4
      ? 'xl:grid-cols-3'
      : config.classes.length > 2
        ? 'xl:grid-cols-4'
        : 'xl:grid-cols-2'
  const actor = props.actor
    ? await players.bySteamId(props.actor, [
        'steamId',
        'bans',
        'activeGame',
        'skill',
        'verified',
        'roles',
      ])
    : undefined
  return (
    <form
      class={['grid grid-cols-1 gap-4 md:grid-cols-2', gridCols]}
      ws-send
      data-disable-when-offline
    >
      {config.classes
        .map(gc => gc.name)
        .map(gameClass => (
          <div class="flex flex-col gap-4">
            <div class="flex flex-row items-center justify-center gap-2">
              <GameClassIcon gameClass={gameClass} size={32} />
              <span class="text-center text-2xl font-bold text-white">{gameClass}</span>
            </div>

            {props.slots
              .filter(slot => slot.gameClass === gameClass)
              .map(slot => (
                <QueueSlot slot={slot} actor={actor} />
              ))}
          </div>
        ))}
    </form>
  )
}

export async function ClearQueueButton(props: { actor?: User | undefined; gamemode: Gamemode }) {
  if (!props.actor?.player.roles.includes(PlayerRole.admin)) {
    return <></>
  }

  return (
    <button
      class="button max-lg:flex-1 max-lg:px-3 max-lg:text-sm max-lg:whitespace-nowrap"
      data-variant="accent"
      data-umami-event="clear-queue"
      hx-delete={`/queue/players?gamemode=${props.gamemode}`}
      hx-confirm="Are you sure you want to kick everyone from the queue?"
    >
      <IconEraser />
      <span>Clear queue</span>
    </button>
  )
}
