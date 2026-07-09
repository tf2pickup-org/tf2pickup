import { configuration } from '../../../../configuration'
import { GameClassSkillInput } from '../../../../html/components/game-class-skill-input'
import { GamemodeTabs } from '../../../../html/components/gamemode-tabs'
import { getQueueConfig } from '../../../../queue-auto/configs'
import { enabledGamemodes } from '../../../../shared/enabled-gamemodes'
import type { Gamemode } from '../../../../shared/types/gamemode'

/**
 * The per-gamemode "Default player skill" section of the player restrictions
 * form. Swapped in place by the gamemode tabs
 * (GET /admin/player-restrictions/default-player-skill?gamemode=...).
 */
export async function DefaultPlayerSkill(props: { gamemode: Gamemode }) {
  const { gamemode } = props
  const defaultPlayerSkill = await configuration.get('games.default_player_skill', gamemode)
  const skillStep = await configuration.get('games.skill_step')
  const classes = getQueueConfig(gamemode).classes.map(({ name }) => name)

  return (
    <dl id="default-player-skill">
      <dt class="flex flex-row flex-wrap items-center justify-between gap-2">
        <span class="text-abru-light-75 font-bold">Default player skill</span>
        {enabledGamemodes.length > 1 && (
          <div class="flex flex-row flex-wrap items-center gap-3">
            <span class="text-abru-light-75 text-sm font-normal">
              Editing for <strong>{gamemode}</strong>
            </span>
            <GamemodeTabs
              active={gamemode}
              fragment
              hxTarget="#default-player-skill"
              hrefFn={tab => `/admin/player-restrictions/default-player-skill?gamemode=${tab}`}
            />
          </div>
        )}
      </dt>
      <dd class="flex flex-col">
        <input type="hidden" name="defaultPlayerSkillGamemode" value={gamemode} />
        <div class="flex flex-row flex-wrap gap-2">
          {classes.map(gameClass => (
            <GameClassSkillInput
              gameClass={gameClass}
              name={`defaultPlayerSkill.${gameClass}`}
              value={defaultPlayerSkill[gameClass] ?? 1}
              step={skillStep}
            />
          ))}
        </div>
        <p class="text-abru-light-75 text-sm">
          If a player starts a game without skill assigned for them, the game balance system will
          use this fallback value.
        </p>
      </dd>
    </dl>
  )
}
