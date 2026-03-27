import { GameEventType } from '../../../database/models/game-event.model'
import type { GameModel } from '../../../database/models/game.model'
import type { PickDeep } from 'type-fest'

type Game = PickDeep<
  GameModel,
  | 'number'
  | 'map'
  | 'state'
  | 'score'
  | 'logsUrl'
  | 'demoUrl'
  | 'events'
  | 'gameServer.name'
  | 'gameServer.provider'
>

export function gameToDto(game: Game) {
  const endedEvent = game.events.find(e => e.event === GameEventType.gameEnded)

  return {
    id: game.number,
    map: game.map,
    state: game.state,
    score: game.score ?? null,
    logsUrl: game.logsUrl ?? null,
    demoUrl: game.demoUrl ?? null,
    createdAt: game.events[0].at.toISOString(),
    endedAt: endedEvent ? endedEvent.at.toISOString() : null,
    gameServer: game.gameServer
      ? { name: game.gameServer.name, provider: game.gameServer.provider }
      : null,
    _links: {
      self: { href: `/api/v1/games/${game.number}` },
      slots: { href: `/api/v1/games/${game.number}/slots` },
      events: { href: `/api/v1/games/${game.number}/events` },
    },
  }
}
