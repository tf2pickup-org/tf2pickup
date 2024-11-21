import { collections } from '../../../database/collections'
import { Layout } from '../../../html/layout'
import { NavigationBar } from '../../../html/components/navigation-bar'
import { QueueSlot } from './queue-slot'
import { resolve } from 'path'
import { config } from '../../config'
import { GameClassIcon } from '../../../html/components/game-class-icon'
import { Page } from '../../../html/components/page'
import type { User } from '../../../auth/types/user'
import { environment } from '../../../environment'
import { OnlinePlayerList } from './online-player-list'
import { RunningGameSnackbar } from './running-game-snackbar'
import { MapVote } from './map-vote'
import { OfflineAlert } from './offline-alert'
import { Footer } from '../../../html/components/footer'
import type { QueueSlotModel } from '../../../database/models/queue-slot.model'
import type { SteamId64 } from '../../../shared/types/steam-id-64'
import { RequestNotificationPermissions } from './request-notification-permissions'
import { SubstitutionRequests } from './substitution-requests'
import { StreamList } from './stream-list'
import { BanAlerts } from './ban-alerts'
import { AcceptRulesDialog } from './accept-rules-dialog'
import { CurrentPlayerCount } from './current-player-count'
import { PreReadyUpButton } from './pre-ready-up-button'

export async function QueuePage(props: { user?: User | undefined }) {
  const slots = await collections.queueSlots.find().toArray()

  const current = slots.filter(slots => Boolean(slots.player)).length
  const required = slots.length

  return (
    <Layout
      title={`[${current}/${required}] ${environment.WEBSITE_NAME}`}
      embedStyle={resolve(import.meta.dirname, 'queue.css')}
    >
      <NavigationBar user={props.user} />
      <Page>
        <div class="container mx-auto grid grid-cols-1 gap-y-8 lg:grid-cols-4 lg:gap-x-4">
          <div class="order-1 grid grid-cols-1 gap-y-2 lg:col-span-4">
            <OfflineAlert />
            <RequestNotificationPermissions />
            <BanAlerts actor={props.user?.player.steamId} />
            <SubstitutionRequests />
          </div>

          <div class="order-2 lg:col-span-3">
            <div class="flex flex-col gap-8">
              <QueueState actor={props.user} />
              <Queue slots={slots} actor={props.user?.player.steamId} />
            </div>
          </div>

          <div class="order-4 lg:col-span-3">
            <MapVote actor={props.user?.player.steamId} />
          </div>

          <div class="order-last lg:order-3 lg:row-span-2">
            <OnlinePlayerList />
          </div>

          <div class="order-5 lg:col-span-4">
            <StreamList />
          </div>
        </div>
      </Page>
      <Footer user={props.user} />

      <div id="queue-notify-container"></div>
      <RunningGameSnackbar gameNumber={props.user?.player.activeGame} />
      <AcceptRulesDialog actor={props.user} />
    </Layout>
  )
}

async function QueueState(props: { actor?: User | undefined }) {
  const required = await collections.queueSlots.countDocuments()
  return (
    <div class="flex flex-col gap-2">
      <form ws-send class="flex flex-row items-center justify-center">
        <h3 class="flex-1 text-center text-2xl font-bold text-ash md:text-start">
          Players: <CurrentPlayerCount />/{required}
        </h3>

        <PreReadyUpButton actor={props.actor?.player.steamId} />
      </form>
      <div class="h-[2px] rounded-sm bg-abru-light-25"></div>
    </div>
  )
}

function Queue(props: { slots: QueueSlotModel[]; actor?: SteamId64 | undefined }) {
  return (
    <form
      class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4"
      ws-send
      _="
      on htmx:wsClose from <body/> add @disabled to <button/> in me
      on htmx:wsOpen from <body/> remove @disabled from <button/> in me
      "
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
                <QueueSlot slot={slot} actor={props.actor} />
              ))}
          </div>
        ))}
    </form>
  )
}
