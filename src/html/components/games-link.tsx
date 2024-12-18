import { requestContext } from '@fastify/request-context'
import { collections } from '../../database/collections'
import { GameState } from '../../database/models/game.model'
import { GameLiveIndicator } from './game-live-indicator'

export async function GamesLink() {
  const gamesLiveCount = await collections.games.countDocuments({
    state: {
      $in: [GameState.created, GameState.configuring, GameState.launching, GameState.started],
    },
  })
  const url = requestContext.get('url')
  return (
    <a
      href="/games"
      class={['menu-item', gamesLiveCount > 0 && 'accent']}
      id="navbar-games-link"
      aria-current={url === '/games' ? 'page' : undefined}
    >
      {gamesLiveCount > 0 ? <GameLiveIndicator /> : <></>}
      Games
    </a>
  )
}
