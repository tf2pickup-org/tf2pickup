import { format } from 'date-fns'
import {
  GameEndedReason,
  GameEventType,
  type GameEventModel,
} from '../../../database/models/game-event.model'
import type { GameModel } from '../../../database/models/game.model'
import { collections } from '../../../database/collections'
import { GameClassIcon } from '../../../html/components/game-class-icon'
import { isBot } from '../../../shared/types/bot'
import { players } from '../../../players'

const renderedEvents = [
  GameEventType.gameCreated,
  GameEventType.gameStarted,
  GameEventType.gameEnded,

  GameEventType.gameServerAssigned,
  GameEventType.gameServerInitialized,

  GameEventType.substituteRequested,
  GameEventType.playerReplaced,

  GameEventType.roundEnded,
]

export async function GameEventList(props: { game: GameModel }) {
  const events = props.game.events.toSorted((a, b) => b.at.getTime() - a.at.getTime())

  return (
    <div class="game-events">
      <span class="text-2xl font-bold text-white">Game events</span>
      <div
        class="game-event-list fade-scroll h-[300px]"
        data-fade-scroll
        id={`game-${props.game.number}-event-list`}
        aria-label="Game events"
      >
        {events.map(event => (
          <GameEvent game={props.game} event={event} />
        ))}
      </div>
    </div>
  )
}

GameEventList.append = function (props: { game: GameModel; event: GameEventModel }) {
  return (
    <div id={`game-${props.game.number}-event-list`} hx-swap-oob="afterbegin">
      <GameEvent {...props} />
    </div>
  )
}

function GameEvent(props: { event: GameEventModel; game: GameModel }) {
  if (!renderedEvents.includes(props.event.event)) {
    return <></>
  }

  return (
    <div
      class={[
        'game-event',
        props.event.event === GameEventType.gameServerInitialized && 'game-event--info',
        props.event.event === GameEventType.substituteRequested && 'game-event--warning',
        props.event.event === GameEventType.playerReplaced && 'game-event--success',
      ]}
    >
      <span class="at" safe>
        {format(props.event.at, 'HH:mm:ss')}
      </span>
      <div>
        <GameEventInfo game={props.game} event={props.event} />
      </div>
    </div>
  )
}

async function GameEventInfo(props: { event: GameEventModel; game: GameModel }) {
  switch (props.event.event) {
    case GameEventType.gameCreated:
      return <span>Game created</span>
    case GameEventType.gameServerAssigned: {
      if (!props.event.actor) {
        return (
          <span>
            Game server assigned:{' '}
            <strong class="whitespace-nowrap">{props.event.gameServerName}</strong>
          </span>
        )
      }

      if (isBot(props.event.actor)) {
        return (
          <span>
            Bot assigned game server:{' '}
            <strong class="whitespace-nowrap">{props.event.gameServerName}</strong>
          </span>
        )
      }

      const actor = await players.bySteamId(props.event.actor)
      return (
        <span>
          <a href={`/players/${actor.steamId}`} safe>
            {actor.name}
          </a>{' '}
          assigned game server:{' '}
          <strong class="whitespace-nowrap">{props.event.gameServerName}</strong>
        </span>
      )
    }
    case GameEventType.gameServerInitialized:
      return <span>Game server initialized</span>
    case GameEventType.gameStarted:
      return <span>Game started</span>
    case GameEventType.gameEnded:
      switch (props.event.reason) {
        case GameEndedReason.interrupted: {
          if (!props.event.actor) {
            return <span>Game interrupted</span>
          }

          if (isBot(props.event.actor)) {
            return <span>Game interrupted by bot</span>
          }

          const actor = await players.bySteamId(props.event.actor)
          return (
            <span>
              Game interrupted by{' '}
              <a href={`/players/${actor.steamId}`} class="whitespace-nowrap font-bold" safe>
                {actor.name}
              </a>
            </span>
          )
        }
        case GameEndedReason.tooManySubstituteRequests:
          return <span>Game interrupted (too many substitute requests)</span>
        default:
          return <span>Game ended</span>
      }
    case GameEventType.substituteRequested: {
      const player = await collections.players.findOne({ steamId: props.event.player })
      if (!player) {
        throw new Error(`player not found: ${props.event.player}`)
      }

      if (props.event.actor) {
        let safeActorDesc: string | Promise<string>
        if (isBot(props.event.actor)) {
          safeActorDesc = 'bot'
        } else {
          const actor = await collections.players.findOne({ steamId: props.event.actor })
          if (!actor) {
            throw new Error(`actor not found: ${props.event.actor}`)
          }

          safeActorDesc = (
            <>
              <a href={`/players/${actor.steamId}`} class="whitespace-nowrap font-bold" safe>
                {actor.name}
              </a>
            </>
          )
        }

        let reason = <></>
        if (props.event.reason) {
          reason = <> (reason: {props.event.reason})</>
        }

        return (
          <span>
            {safeActorDesc} requested substitute for{' '}
            <a href={`/players/${player.steamId}`} class="whitespace-nowrap font-bold">
              <GameClassIcon gameClass={props.event.gameClass} size={20} />{' '}
              <span safe>{player.name}</span>
            </a>
            {reason}
          </span>
        )
      } else {
        return (
          <span>
            Requested substitute for{' '}
            <a href={`/player/${player.steamId}`} class="whitespace-nowrap font-bold">
              <GameClassIcon gameClass={props.event.gameClass} size={20} />{' '}
              <span safe>{player.name}</span>
            </a>
          </span>
        )
      }
    }
    case GameEventType.playerReplaced: {
      const replacee = await collections.players.findOne({ steamId: props.event.replacee })
      if (!replacee) {
        throw new Error(`replacee not found: ${replacee}`)
      }
      const replacement = await collections.players.findOne({ steamId: props.event.replacement })
      if (!replacement) {
        throw new Error(`replacement not found: ${replacement}`)
      }

      const slot = props.game.slots.find(({ player }) => player === replacement.steamId)
      if (!slot) {
        throw new Error(
          `replacement slot not found (gameNumber=${props.game.number}; replacement=${props.event.replacement.toString()}`,
        )
      }

      return (
        <span>
          <a href={`/players/${replacement.steamId}`} class="whitespace-nowrap font-bold" safe>
            {replacement.name}
          </a>{' '}
          replaced{' '}
          <a href={`/players/${replacee.steamId}`} class="whitespace-nowrap font-bold" safe>
            {replacee.name}
          </a>{' '}
          on <GameClassIcon gameClass={slot.gameClass} size={20} /> {slot.gameClass}
        </span>
      )
    }
    case GameEventType.roundEnded: {
      return (
        <div class="flex flex-row items-center gap-2">
          <span class="flex-1">Round ended</span>
          <span class="rounded bg-team-blu px-2 py-1">BLU: {props.event.score.blu}</span>
          <span class="rounded bg-team-red px-2 py-1">RED: {props.event.score.red}</span>
        </div>
      )
    }

    default:
      return <span class="italic">{props.event.event}</span>
  }
}
