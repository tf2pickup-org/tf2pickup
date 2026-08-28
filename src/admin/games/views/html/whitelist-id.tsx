import { configuration } from '../../../../configuration'
import { GamemodeTabs } from '../../../../html/components/gamemode-tabs'
import { gamemodeDisplayName } from '../../../../shared/gamemode-display-name'
import type { Gamemode } from '../../../../shared/types/gamemode'

/**
 * The per-gamemode "Whitelist ID" section of the games form. Swapped in place by
 * its gamemode tabs (GET /admin/games/whitelist-id?gamemode=...).
 */
export async function WhitelistId(props: { gamemode: Gamemode }) {
  const { gamemode } = props
  const whitelistId = await configuration.get('games.whitelist_id', gamemode)

  return (
    <dl id="whitelist-id">
      <dt class="flex flex-row flex-wrap items-center justify-between gap-2">
        <label for="whitelistId">
          Whitelist ID{' '}
          <span class="text-abru-light-35 text-sm font-normal" safe>
            {gamemodeDisplayName(gamemode)}
          </span>
        </label>
        <GamemodeTabs
          active={gamemode}
          fragment
          hxTarget="#whitelist-id"
          hrefFn={tab => `/admin/games/whitelist-id?gamemode=${tab}`}
        />
      </dt>
      <dd>
        <input type="hidden" name="whitelistGamemode" value={gamemode} />
        <input
          type="text"
          name="whitelistId"
          value={whitelistId ?? ''}
          id="whitelistId"
          class="col-span-3"
        />
      </dd>
    </dl>
  )
}
