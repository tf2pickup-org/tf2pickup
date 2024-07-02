import { format } from 'date-fns'
import { GameEventType, type GameEventModel } from '../../../database/models/game-event.model'
import type { GameModel } from '../../../database/models/game.model'

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
    <div class="game-event-list masked-overflow">
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
        {format(props.event.at, 'HH:mm')}
      </span>
      <div>
        <GameEventInfo event={props.event} />
      </div>
    </div>
  )
}

function GameEventInfo(props: { event: GameEventModel }) {
  switch (props.event.event) {
    case GameEventType.gameCreated:
      return <span>Game created</span>
    default:
      return <span class="italic">{props.event.event}</span>
  }
}
