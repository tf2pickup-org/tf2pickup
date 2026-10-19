import { requestContext } from '@fastify/request-context'
import type { User } from '../../../../auth/types/user'
import { collections } from '../../../../database/collections'
import { PlayerRole } from '../../../../database/models/player.model'
import type { QueueModel } from '../../../../database/models/queue.model'
import type { QueueSlotModel } from '../../../../database/models/queue-slot.model'
import { gamemodeConfigs } from '../../../../gamemodes/configs'
import { GameClassIcon } from '../../../../html/components/game-class-icon'
import { IconEraser } from '../../../../html/components/icons'
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
// shared by all of them and stays in place when switching queues.
export async function QueueContent(props: { queue: QueueModel }) {
  const { queue } = props
  const slots = await collections.queueSlots.find({ queue: queue._id }).toArray()
  const required = slots.length
  const user = requestContext.get('user')

  return (
    <div id="queue-content" class="tab-content lg:contents!">
      <IsInQueue queue={queue._id} actor={user?.player.steamId} />
      <MapVoteSelection queue={queue._id} actor={user?.player.steamId} />
      <div class="order-3 lg:order-2 lg:col-span-3">
        <div class="flex flex-col gap-8">
          <QueueSwitcher active={queue} />
          <QueueState queue={queue} actor={user} required={required} />
          <Queue queue={queue} slots={slots} actor={user?.player.steamId} />
        </div>
      </div>

      <div class="order-4 lg:col-span-3">
        <MapVote queue={queue._id} actor={user?.player.steamId} />
      </div>

      <div class="order-5 lg:col-span-4">
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
    <div class="flex flex-col gap-2">
      <form ws-send class="flex flex-row items-center justify-center">
        <h3 class="text-ash flex-1 text-center text-2xl font-bold max-lg:hidden md:text-start">
          Players: <CurrentPlayerCount queue={props.queue._id} />/{props.required}
        </h3>

        <div class="flex flex-row gap-2 max-lg:grow">
          <ClearQueueButton queue={props.queue} actor={props.actor} />
          <PreReadyUpButton actor={props.actor?.player.steamId} />
        </div>
      </form>
      <div class="bg-abru-light-25 h-[2px] rounded-xs max-lg:hidden"></div>
    </div>
  )
}

async function Queue(props: {
  queue: QueueModel
  slots: QueueSlotModel[]
  actor?: SteamId64 | undefined
}) {
  const config = gamemodeConfigs[props.queue.gamemode]
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
      class="button max-lg:flex-1 max-lg:px-3 max-lg:text-sm max-lg:whitespace-nowrap"
      data-variant="accent"
      data-umami-event="clear-queue"
      hx-delete={`${queues.queuePageUrl(props.queue.slug)}/players`}
      hx-confirm="Are you sure you want to kick everyone from the queue?"
    >
      <IconEraser />
      <span>Clear queue</span>
    </button>
  )
}
