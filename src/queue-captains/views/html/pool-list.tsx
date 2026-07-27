import { GameClassIcon } from '../../../html/components/game-class-icon'
import { IconCrown } from '../../../html/components/icons'
import type { SteamId64 } from '../../../shared/types/steam-id-64'
import { getPool } from '../../get-pool'

export async function PoolList(props: { actor?: SteamId64 | undefined }) {
  const pool = await getPool()

  return (
    <div id="captains-pool-list" class="pool-list">
      <div class="pool-head">
        <span class="pool-title">Pool · {pool.length}</span>
      </div>

      {pool.length === 0 ? (
        <p class="pool-empty">Nobody is queued yet. Pick a class above to start it off.</p>
      ) : (
        <div class="pool-grid">
          {pool.map(entry => (
            <div
              class="pool-entry"
              data-self={`${entry.player.steamId === props.actor}`}
              data-ready={`${entry.ready}`}
            >
              <img src={entry.player.avatarUrl} width="40" height="40" alt="" loading="lazy" />
              <a
                class="pool-name"
                href={`/players/${entry.player.steamId}`}
                preload="mousedown"
                safe
              >
                {entry.player.name}
              </a>
              {entry.wantsToCaptain && (
                <span class="pool-crown" title="Wants to captain">
                  <IconCrown size={15} />
                  <span class="sr-only">Volunteered as captain</span>
                </span>
              )}
              <span class="pool-classes">
                {entry.gameClasses.map(gameClass => (
                  <span class="pool-class">
                    <GameClassIcon gameClass={gameClass} size={18} />
                  </span>
                ))}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
