import { format } from 'date-fns'
import {
  GameEndedReason,
  GameEventType,
  type GameEventModel,
} from '../../../database/models/game-event.model'
import type { GameModel } from '../../../database/models/game.model'
import { GameClassIcon } from '../../../html/components/game-class-icon'
import { isBot } from '../../../shared/types/bot'
import { PlayerLink } from '../../../html/components/player-link'
import { isStopwatchGame } from '../../is-stopwatch-game'

const renderedEvents = [
  GameEventType.gameCreated,
  GameEventType.gameStarted,
  GameEventType.gameRestarted,
  GameEventType.gameEnded,

  GameEventType.gameServerAssigned,
  GameEventType.gameServerAssignmentFailed,
  GameEventType.gameServerReinitializationOrdered,
  GameEventType.gameServerInitialized,
  GameEventType.gameServerConfigureFailed,

  GameEventType.substituteRequested,
  GameEventType.playerReplaced,

  GameEventType.roundEnded,
  GameEventType.scoreCorrected,
  GameEventType.teamsSwapped,
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

  // On stopwatch (payload & attack/defend) maps the per-round score only counts
  // captured control points, not the match score, so "Round ended" rows like
  // "BLU: 4 RED: 4" are meaningless to viewers. Hide them on those maps; the
  // "Teams swapped sides" and "Score corrected" events tell the real story.
  if (props.event.event === GameEventType.roundEnded && isStopwatchGame(props.game.events)) {
    return <></>
  }

  return (
    <div class="game-event" data-tone={getGameEventTone(props.event.event)}>
      <span class="at" safe>
        {format(props.event.at, 'HH:mm:ss')}
      </span>
      <div>
        <GameEventInfo game={props.game} event={props.event} />
      </div>
    </div>
  )
}

function getGameEventTone(event: GameEventType) {
  switch (event) {
    case GameEventType.gameServerInitialized:
    case GameEventType.scoreCorrected:
    case GameEventType.teamsSwapped:
      return 'info'
    case GameEventType.substituteRequested:
      return 'warning'
    case GameEventType.playerReplaced:
      return 'success'
    case GameEventType.gameServerAssignmentFailed:
    case GameEventType.gameServerConfigureFailed:
      return 'error'
    default:
      return undefined
  }
}

async function GameEventInfo(props: { event: GameEventModel; game: GameModel }) {
  switch (props.event.event) {
    case GameEventType.gameCreated:
      return <span>Game created</span>
    case GameEventType.gameServerAssigned: {
      if (!props.event.actor) {
        return (
          <span class="flex min-w-0 flex-wrap gap-x-1">
            <span class="shrink-0 whitespace-nowrap">Game server assigned:</span>
            <strong class="min-w-0 grow overflow-hidden text-ellipsis whitespace-nowrap" safe>
              {props.event.gameServerName}
            </strong>
          </span>
        )
      }

      if (isBot(props.event.actor)) {
        return (
          <span class="flex min-w-0 flex-wrap gap-x-1">
            <span class="shrink-0 whitespace-nowrap">Bot assigned game server:</span>
            <strong class="min-w-0 grow overflow-hidden text-ellipsis whitespace-nowrap" safe>
              {props.event.gameServerName}
            </strong>
          </span>
        )
      }

      return (
        <span class="flex min-w-0 flex-wrap gap-x-1">
          <span class="shrink-0 whitespace-nowrap">
            <PlayerLink steamId={props.event.actor} />
            {' assigned game server:'}
          </span>
          <strong class="min-w-0 grow overflow-hidden text-ellipsis whitespace-nowrap" safe>
            {props.event.gameServerName}
          </strong>
        </span>
      )
    }
    case GameEventType.gameServerAssignmentFailed:
      return (
        <span>
          Error: <strong safe>{props.event.reason}</strong>
        </span>
      )
    case GameEventType.gameServerConfigureFailed:
      return <span>Error configuring game server</span>
    case GameEventType.gameServerReinitializationOrdered: {
      let actor = <></>
      if (props.event.actor) {
        actor = (
          <>
            by <PlayerLink steamId={props.event.actor} class="font-bold whitespace-nowrap" />
          </>
        )
      }
      return <span>Game reserver reinitialized {actor}</span>
    }
    case GameEventType.gameServerInitialized:
      return <span>Game server initialized</span>
    case GameEventType.gameStarted:
      return <span>Game started</span>
    case GameEventType.gameRestarted:
      return <span>Game restarted</span>
    case GameEventType.gameEnded:
      switch (props.event.reason) {
        case GameEndedReason.interrupted: {
          if (!props.event.actor) {
            return <span>Game interrupted</span>
          }

          if (isBot(props.event.actor)) {
            return <span>Game interrupted by bot</span>
          }

          return (
            <span>
              Game interrupted by{' '}
              <PlayerLink steamId={props.event.actor} class="font-bold whitespace-nowrap" />
            </span>
          )
        }
        case GameEndedReason.tooManySubstituteRequests:
          return <span>Game interrupted (too many substitute requests)</span>
        default:
          return <span>Game ended</span>
      }
    case GameEventType.substituteRequested: {
      const playerRef = (
        <span class="font-bold whitespace-nowrap">
          <GameClassIcon gameClass={props.event.gameClass} size={20} />{' '}
          <PlayerLink steamId={props.event.player} />
        </span>
      )

      if (props.event.actor) {
        const safeActorDesc = isBot(props.event.actor) ? (
          'bot'
        ) : (
          <PlayerLink steamId={props.event.actor} class="font-bold whitespace-nowrap" />
        )

        let reason = <></>
        if (props.event.reason) {
          const safeReason = props.event.reason
          reason = <> (reason: {safeReason})</>
        }

        return (
          <span>
            {safeActorDesc} requested substitute for {playerRef}
            {reason}
          </span>
        )
      } else {
        return <span>Requested substitute for {playerRef}</span>
      }
    }
    case GameEventType.playerReplaced: {
      return (
        <span>
          <PlayerLink steamId={props.event.replacement} class="font-bold whitespace-nowrap" />{' '}
          replaced <PlayerLink steamId={props.event.replacee} class="font-bold whitespace-nowrap" />{' '}
          on <GameClassIcon gameClass={props.event.gameClass} size={20} /> {props.event.gameClass}
        </span>
      )
    }
    case GameEventType.roundEnded: {
      return (
        <div class="flex flex-row items-center gap-2">
          <span class="flex-1">Round ended</span>
          <span class="bg-team-blu rounded-sm px-2 py-1 tabular-nums">
            BLU: {props.event.score.blu}
          </span>
          <span class="bg-team-red rounded-sm px-2 py-1 tabular-nums">
            RED: {props.event.score.red}
          </span>
        </div>
      )
    }
    case GameEventType.scoreCorrected: {
      return (
        <div class="flex flex-row items-center gap-2">
          <span class="flex-1">Score corrected</span>
          <span class="bg-team-blu rounded-sm px-2 py-1 tabular-nums">
            BLU: {props.event.score.blu}
          </span>
          <span class="bg-team-red rounded-sm px-2 py-1 tabular-nums">
            RED: {props.event.score.red}
          </span>
        </div>
      )
    }
    case GameEventType.teamsSwapped:
      return <span>Teams swapped sides</span>

    default:
      return <span class="italic">{props.event.event}</span>
  }
}
