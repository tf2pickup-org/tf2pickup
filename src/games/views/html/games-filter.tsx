import { collections } from '../../../database/collections'
import { IconChevronDown, IconFilter2 } from '../../../html/components/icons'
import { Gamemode } from '../../../shared/types/gamemode'

export async function GamesFilter(props: { gamemode?: Gamemode | undefined }) {
  const played = await collections.games.distinct('gamemode')
  const gamemodes = Object.values(Gamemode).filter(gamemode => played.includes(gamemode))

  return (
    <div class="games-filter">
      <details class="games-filter-bar" data-dropdown>
        <summary>
          <IconFilter2 />
          <span>Mode:</span>
          {props.gamemode ? (
            <span>{props.gamemode}</span>
          ) : (
            <span class="games-filter-placeholder">All</span>
          )}
          <IconChevronDown class="games-filter-chevron" />
        </summary>
        <div class="games-filter-menu">
          {gamemodes.map(gamemode => (
            <a
              href={`/games?gamemode=${gamemode}`}
              aria-current={gamemode === props.gamemode ? 'true' : undefined}
              data-umami-event="filter-games"
              data-umami-event-gamemode={gamemode}
            >
              {gamemode}
            </a>
          ))}
        </div>
      </details>
      <a href="/games" class="games-filter-clear">
        Clear
      </a>
    </div>
  )
}
