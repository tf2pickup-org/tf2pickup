import { configuration } from '../../../../configuration'
import { GamemodeTabs } from '../../../../html/components/gamemode-tabs'
import { gamemodeDisplayName } from '../../../../shared/gamemode-display-name'
import type { Gamemode } from '../../../../shared/types/gamemode'

/**
 * The per-gamemode "Player skill threshold" section of the player restrictions
 * form. Swapped in place by its gamemode tabs
 * (GET /admin/player-restrictions/player-skill-threshold?gamemode=...).
 */
export async function PlayerSkillThreshold(props: { gamemode: Gamemode }) {
  const { gamemode } = props
  const playerSkillThreshold = await configuration.get('queue.player_skill_threshold', gamemode)
  const playerSkillThresholdEnabled = playerSkillThreshold !== null

  return (
    <dl id="player-skill-threshold">
      <dt class="group flex flex-row flex-wrap items-center gap-2">
        <label for="playerSkillThresholdEnabled">Player skill threshold</label>
        <input
          type="checkbox"
          id="playerSkillThresholdEnabled"
          name="playerSkillThresholdEnabled"
          value="enabled"
          checked={playerSkillThresholdEnabled}
        />
        <span class="hidden group-has-checked:inline-block">enabled</span>
        <span class="group-has-checked:hidden">disabled</span>
        <span class="text-abru-light-35 text-sm font-normal" safe>
          {gamemodeDisplayName(gamemode)}
        </span>
        <span class="grow"></span>
        <GamemodeTabs
          active={gamemode}
          fragment
          hxTarget="#player-skill-threshold"
          hrefFn={tab => `/admin/player-restrictions/player-skill-threshold?gamemode=${tab}`}
        />
      </dt>
      <dd class="flex flex-col">
        <input type="hidden" name="playerSkillThresholdGamemode" value={gamemode} />
        <div>
          <label for="playerSkillThreshold" class="sr-only">
            Player skill threshold value
          </label>
          <input
            type="number"
            id="playerSkillThreshold"
            name="playerSkillThreshold"
            value={playerSkillThreshold?.toString()}
            disabled={!playerSkillThresholdEnabled}
            data-toggle-disabled-form="#playerRestrictionsForm"
            data-toggle-disabled-control="playerSkillThresholdEnabled"
            data-toggle-disabled-checked="true"
          />
        </div>
        <p class="text-abru-light-75 text-sm">
          Players will be able to join queue only on classes that meet the given criteria.
        </p>
      </dd>
    </dl>
  )
}
