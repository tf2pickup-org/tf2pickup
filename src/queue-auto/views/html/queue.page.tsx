import { collections } from '../../../database/collections'
import { QueueSlot } from './queue-slot'
import { resolve } from 'path'
import { config } from '../../config'
import { GameClassIcon } from '../../../html/components/game-class-icon'
import type { User } from '../../../auth/types/user'
import { MapVote } from './map-vote'
import type { QueueSlotModel } from '../../../database/models/queue-slot.model'
import type { SteamId64 } from '../../../shared/types/steam-id-64'
import { CurrentPlayerCount } from './current-player-count'
import { PreReadyUpButton } from '../../../pre-ready/views/html/pre-ready-up-button'
import { IsInQueue } from './is-in-queue'
import { MapVoteSelection } from './map-vote-selection'
import { requestContext } from '@fastify/request-context'
import { ClearQueueButton } from '../../../queue/views/html/clear-queue-button'
import { QueuePageShell } from '../../../queue/views/html/queue-page-shell'
import { players } from '../../../players'

export async function QueuePage() {
  const slots = await collections.queueSlots.find().toArray()
  const current = slots.filter(slots => Boolean(slots.player)).length
  const required = slots.length
  const user = requestContext.get('user')

  return (
    <QueuePageShell
      count={current}
      required={required}
      embedStyle={resolve(import.meta.dirname, 'style.css')}
    >
      <IsInQueue actor={user?.player.steamId} />
      <MapVoteSelection actor={user?.player.steamId} />

      <div class="order-3 lg:order-2 lg:col-span-3">
        <div class="flex flex-col gap-8">
          <QueueHeader actor={user} required={required} />
          <Queue slots={slots} actor={user?.player.steamId} />
        </div>
      </div>

      <div class="order-4 lg:col-span-3">
        <MapVote actor={user?.player.steamId} />
      </div>
    </QueuePageShell>
  )
}

async function QueueHeader(props: { actor?: User | undefined; required: number }) {
  return (
    <div class="flex flex-col gap-2">
      <form ws-send class="flex flex-row items-center justify-center">
        <h3 class="text-ash flex-1 text-center text-2xl font-bold max-lg:hidden md:text-start">
          Players: <CurrentPlayerCount />/{props.required}
        </h3>

        <div class="flex flex-row gap-2 max-lg:grow">
          <ClearQueueButton actor={props.actor} />
          <PreReadyUpButton actor={props.actor?.player.steamId} />
        </div>
      </form>
      <div class="bg-abru-light-25 h-[2px] rounded-xs max-lg:hidden"></div>
    </div>
  )
}

async function Queue(props: { slots: QueueSlotModel[]; actor?: SteamId64 | undefined }) {
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
