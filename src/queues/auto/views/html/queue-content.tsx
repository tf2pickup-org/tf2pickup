import { requestContext } from '@fastify/request-context'
import type { User } from '../../../../auth/types/user'
import { collections } from '../../../../database/collections'
import { PlayerRole } from '../../../../database/models/player.model'
import type { QueueModel } from '../../../../database/models/queue.model'
import type { QueueSlotModel } from '../../../../database/models/queue-slot.model'
import { gamemodeConfigs } from '../../../../gamemodes/configs'
import { GameClassIcon } from '../../../../html/components/game-class-icon'
import { players } from '../../../../players'
import { PreReadyUpButton } from '../../../../pre-ready/views/html/pre-ready-up-button'
import type { SteamId64 } from '../../../../shared/types/steam-id-64'
import { queues } from '../../..'
import { CurrentPlayerCount } from './current-player-count'
import { IsInQueue } from './is-in-queue'
import { MapVote } from './map-vote'
import { MapVoteSelection } from './map-vote-selection'
import { QueueSlot } from './queue-slot'
import { QueueSwitcher } from './queue-switcher'
import { StreamList } from './stream-list'

// The part of the queue page that belongs to one queue; the rest (chat, online players…) is
// shared by all of them and stays in place when switching queues. Its children are laid out by the
// page's grid.
export async function QueueContent(props: { queue: QueueModel }) {
  const { queue } = props
  const slots = await collections.queueSlots.find({ queue: queue._id }).toArray()
  const required = slots.length
  const user = requestContext.get('user')

  return (
    <div id="queue-content" class="tab-content max-lg:order-3 lg:contents!">
      <div class="queue-toolbar">
        <IsInQueue queue={queue._id} actor={user?.player.steamId} />
        <MapVoteSelection queue={queue._id} actor={user?.player.steamId} />
        <QueueSwitcher active={queue} />
        <QueueState queue={queue} actor={user} required={required} />
      </div>
      <div class="queue-content">
        <Queue queue={queue} slots={slots} actor={user?.player.steamId} />
        <MapVote queue={queue._id} actor={user?.player.steamId} />
        <StreamList />
      </div>
    </div>
  )
}

async function QueueState(props: {
  queue: QueueModel
  actor?: User | undefined
  required: number
}) {
  return (
    <div class="queue-state">
      <form ws-send class="queue-state-form">
        <h1 class="queue-player-count">
          Players <CurrentPlayerCount queue={props.queue._id} />/{props.required}
        </h1>
        <div class="queue-state-actions">
          <ClearQueueButton queue={props.queue} actor={props.actor} />
          <PreReadyUpButton actor={props.actor?.player.steamId} />
        </div>
      </form>
    </div>
  )
}

async function Queue(props: {
  queue: QueueModel
  slots: QueueSlotModel[]
  actor?: SteamId64 | undefined
}) {
  const config = gamemodeConfigs[props.queue.gamemode]
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

  // a team of two fits in rows, one per team
  if (positions.length === 2) {
    const teamNames = ['BLU', 'RED'] as const
    const teamSlots = teamNames.map((_, teamIndex) =>
      positions.map(
        position =>
          props.slots.filter(slot => slot.gameClass === position.gameClass)[
            position.classIndex * config.teamCount + teamIndex
          ],
      ),
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
            {teamSlots[teamIndex]
              ?.filter(slot => slot !== undefined)
              .map(slot => (
                <QueueSlot queue={props.queue} slot={slot} actor={actor} />
              ))}
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
                <QueueSlot queue={props.queue} slot={slot} actor={actor} />
              ))}
          </div>
        ))}
    </form>
  )
}

export async function ClearQueueButton(props: {
  queue: Pick<QueueModel, 'slug'>
  actor?: User | undefined
}) {
  if (!props.actor?.player.roles.includes(PlayerRole.admin)) {
    return <></>
  }

  return (
    <button
      class="button queue-clear-button max-lg:flex-1 max-lg:px-3 max-lg:text-sm max-lg:whitespace-nowrap"
      data-variant="accent"
      data-umami-event="clear-queue"
      hx-delete={`${queues.queuePageUrl(props.queue.slug)}/players`}
      hx-confirm="Are you sure you want to kick everyone from the queue?"
    >
      <span>Clear queue</span>
    </button>
  )
}
