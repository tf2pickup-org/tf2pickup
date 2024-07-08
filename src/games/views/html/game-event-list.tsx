import { format } from 'date-fns'
import {
  GameEndedReason,
  GameEventType,
  type GameEventModel,
} from '../../../database/models/game-event.model'
import type { GameModel } from '../../../database/models/game.model'
import { collections } from '../../../database/collections'
import { GameClassIcon } from '../../../html/components/game-class-icon'

const renderedEvents = [
  GameEventType.gameCreated,
  GameEventType.gameStarted,
  GameEventType.gameEnded,

  GameEventType.gameServerAssigned,
  GameEventType.gameServerInitialized,

  GameEventType.substituteRequested,
  GameEventType.playerReplaced,
]

export async function GameEventList(props: { game: GameModel }) {
  const events = props.game.events
    .filter(({ event }) => renderedEvents.includes(event))
    .toSorted((a, b) => b.at.getTime() - a.at.getTime())

  return (
    <div
      class="game-event-list masked-overflow"
      id={`game-${props.game.number}-event-list`}
      aria-label="Game events"
    >
      {events.map(event => (
        <GameEvent event={event} />
      ))}
    </div>
  )
}

function GameEvent(props: { event: GameEventModel }) {
  return (
    <div
      class={[
        'game-event',
        props.event.event === GameEventType.gameServerInitialized && 'game-event--info',
      ]}
    >
      <span class="at" safe>
        {format(props.event.at, 'HH:mm:ss')}
      </span>
      <div>
        <GameEventInfo event={props.event} />
      </div>
    </div>
  )
}

async function GameEventInfo(props: { event: GameEventModel }) {
  switch (props.event.event) {
    case GameEventType.gameCreated:
      return <span>Game created</span>
    case GameEventType.gameServerAssigned:
      if (props.event.actor) {
        const actor = await collections.players.findOne({ _id: props.event.actor })
        if (!actor) {
          throw new Error(`actor not found: ${props.event.actor.toString()}`)
        }

        return (
          <span>
            <a href={`/players/${actor.steamId}`} safe>
              {actor.name}
            </a>{' '}
            assigned game server:{' '}
            <strong class="whitespace-nowrap">{props.event.gameServerName}</strong>
          </span>
        )
      } else {
        return (
          <span>
            Game server assigned:{' '}
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
        case GameEndedReason.matchEnded:
          return <span>Game ended</span>
        case GameEndedReason.interrupted:
          if (props.event.actor) {
            const actor = await collections.players.findOne({ _id: props.event.actor })
            if (!actor) {
              throw new Error(`actor not found: ${props.event.actor.toString()}`)
            }

            return (
              <span>
                Game interrupted by{' '}
                <a href={`/players/${actor.steamId}`} safe>
                  {actor.name}
                </a>
              </span>
            )
          } else {
            return <span>Game interrupted</span>
          }
        default:
          return <></>
      }
    case GameEventType.substituteRequested: {
      const player = await collections.players.findOne({ _id: props.event.player })
      if (!player) {
        throw new Error(`player not found: ${props.event.player.toString()}`)
      }

      if (props.event.actor) {
        const actor = await collections.players.findOne({ _id: props.event.actor })
        if (!actor) {
          throw new Error(`actor not found: ${props.event.actor.toString()}`)
        }

        return (
          <span>
            <a href={`/players/${actor.steamId}`} class="font-bold whitespace-nowrap">
              {actor.name}
            </a>{' '}
            requested substitute for{' '}
            <a href={`/player/${player.steamId}`} class="font-bold whitespace-nowrap">
              <GameClassIcon gameClass={props.event.gameClass} size={20} /> {player.name}
            </a>
          </span>
        )
      } else {
        return (
          <span>
            Requested substitute for{' '}
            <a href={`/player/${player.steamId}`} class="font-bold whitespace-nowrap">
              <GameClassIcon gameClass={props.event.gameClass} size={20} /> {player.name}
            </a>
          </span>
        )
      }
    }

    default:
      return <span class="italic">{props.event.event}</span>
  }
}

// function MatchScore(props: { score: Record<Tf2Team, number> }) {
//   return (
//     <div class="flex flex-row flex-nowrap">
//       <span class="bg-team-red rounded px-2 py-1">{props.score.red}</span>
//       <span class="bg-team-blu rounded px-2 py-1">{props.score.blu}</span>
//     </div>
//   )
// }
