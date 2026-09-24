import { collections } from '../../../database/collections'
import { Layout } from '../../../html/layout'
import { NavigationBar } from '../../../html/components/navigation-bar'
import { QueueSlot } from './queue-slot'
import { resolve } from 'path'
import { getQueueConfig } from '../../configs'
import { GameClassIcon } from '../../../html/components/game-class-icon'
import { Page } from '../../../html/components/page'
import type { User } from '../../../auth/types/user'
import { environment } from '../../../environment'
import type { Gamemode } from '../../../shared/types/gamemode'
import { queuePageUrl } from '../../queue-page-url'
import { GamemodeSelector } from './gamemode-selector'
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
import { players } from '../../../players'

export async function QueuePage(props: { gamemode: Gamemode; partial?: boolean }) {
  const { gamemode } = props
  const slots = await collections.queueSlots.find({ gamemode }).toArray()
  const current = slots.filter(slots => Boolean(slots.player)).length
  const required = slots.length
  const user = requestContext.get('user')

  if (props.partial) {
    return (
      <>
        <Queue slots={slots} gamemode={gamemode} actor={user?.player.steamId} />
        <GamemodeSelector active={gamemode} />
        <QueueState actor={user} gamemode={gamemode} required={required} />
        <MapVote gamemode={gamemode} actor={user?.player.steamId} />
        <IsInQueue gamemode={gamemode} actor={user?.player.steamId} />
        <MapVoteSelection gamemode={gamemode} actor={user?.player.steamId} />
      </>
    )
  }

  return (
    <Layout
      title={`[${current}/${required}] ${environment.WEBSITE_NAME}`}
      description={`${gamemode} competitive pick-up games for everyone`}
      canonical={queuePageUrl(gamemode)}
      embedStyle={resolve(import.meta.dirname, 'style.css')}
    >
      <NavigationBar queuePage />
      <Page>
        <IsInQueue gamemode={gamemode} actor={user?.player.steamId} />
        <MapVoteSelection gamemode={gamemode} actor={user?.player.steamId} />
        <div class="queue-page">
          <div class="queue-alerts">
            <OfflineAlert />
            {!!user && <RequestNotificationPermissions />}
            {!!user && <SoundBlockedAlert />}
            <BanAlerts actor={user?.player.steamId} />
            <SubstitutionRequests />
            <Announcements />
          </div>
          <div class="queue-page-layout">
            <div class="queue-toolbar">
              <GamemodeSelector active={gamemode} />
              <QueueState actor={user} gamemode={gamemode} required={required} />
            </div>
            <Sidebar user={user} gamemode={gamemode} required={required} />
            <div id="queue-content" class="queue-content tab-content lg:block!">
              <Queue slots={slots} gamemode={gamemode} actor={user?.player.steamId} />
              <MapVote gamemode={gamemode} actor={user?.player.steamId} />
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
    <div id="queue-state" class="queue-state">
      <form ws-send class="queue-state-form">
        <h1 class="queue-player-count">
          Players <CurrentPlayerCount gamemode={props.gamemode} />/{props.required}
        </h1>
        <div class="queue-state-actions">
          <ClearQueueButton actor={props.actor} gamemode={props.gamemode} />
          <PreReadyUpButton actor={props.actor?.player.steamId} />
        </div>
      </form>
    </div>
  )
}

async function Queue(props: {
  slots: QueueSlotModel[]
  gamemode: Gamemode
  actor?: SteamId64 | undefined
}) {
  const config = getQueueConfig(props.gamemode)
  const positions = config.classes.flatMap(gameClass =>
    Array.from({ length: gameClass.count }, (_, classIndex) => ({
      gameClass: gameClass.name,
      classIndex,
    })),
  )
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

  if (positions.length === 2) {
    const teamNames = ['BLU', 'RED'] as const
    const slotsByClass = new Map(
      config.classes.map(gameClass => [
        gameClass.name,
        props.slots.filter(slot => slot.gameClass === gameClass.name),
      ]),
    )
    const teamSlots = teamNames.map((_, teamIndex) =>
      positions.map(position => {
        const classSlots = slotsByClass.get(position.gameClass) ?? []
        return classSlots[position.classIndex * config.teamCount + teamIndex]
      }),
    )

    return (
      <form id="queue" class="queue-compact-grid" ws-send data-disable-when-offline>
        <div class="queue-team-heading-spacer" aria-hidden="true"></div>
        {positions.map(position => (
          <h2 class="queue-class-heading">
            <GameClassIcon gameClass={position.gameClass} size={32} />
            <span>{position.gameClass}</span>
          </h2>
        ))}

        {teamNames.map((teamName, teamIndex) => (
          <div class="queue-team-row">
            <div
              class={[
                'queue-team-summary',
                teamName === 'BLU' ? 'queue-team-blu' : 'queue-team-red',
              ]}
            >
              <span>{teamName}</span>
              <span>
                {teamSlots[teamIndex]?.filter(slot => slot?.player).length ?? 0}/{positions.length}
              </span>
            </div>
            {teamSlots[teamIndex]?.map(slot => slot && <QueueSlot slot={slot} actor={actor} />)}
          </div>
        ))}
      </form>
    )
  }

  return (
    <form
      id="queue"
      class={['queue-class-grid grid grid-cols-1 gap-4 md:grid-cols-2', gridCols]}
      ws-send
      data-disable-when-offline
    >
      {config.classes
        .map(gc => gc.name)
        .map(gameClass => (
          <div class="queue-class-column">
            <h2 class="queue-class-heading">
              <GameClassIcon gameClass={gameClass} size={32} />
              <span>{gameClass}</span>
            </h2>

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
      class="button queue-clear-button max-lg:flex-1 max-lg:px-3 max-lg:text-sm max-lg:whitespace-nowrap"
      data-variant="accent"
      data-umami-event="clear-queue"
      hx-delete={`/queue/players?gamemode=${props.gamemode}`}
      hx-confirm="Are you sure you want to kick everyone from the queue?"
    >
      <span>Clear queue</span>
    </button>
  )
}
