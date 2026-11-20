import { collections } from '../../database/collections'
import { GameLiveIndicator } from './game-live-indicator'
import { isCurrentPage } from '../is-current-page'
import { runningGameStates } from '../../games/lifecycle/running-game-states'

export async function GamesLink() {
  const gamesLiveCount = await collections.games.countDocuments({
    state: {
      $in: runningGameStates,
    },
  })
  return (
    <a
      href="/games"
      class="nav-menu-item"
      data-accent={gamesLiveCount > 0 ? 'true' : undefined}
      id="navbar-games-link"
      aria-current={isCurrentPage('/games') ? 'page' : undefined}
    >
      {gamesLiveCount > 0 ? <GameLiveIndicator /> : <></>}
      Games
    </a>
  )
}
