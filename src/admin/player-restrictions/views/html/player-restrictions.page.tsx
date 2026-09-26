import { queues } from '../../../../queues'
import { gamemodeConfigs } from '../../../../gamemodes/configs'
import { configuration } from '../../../../configuration'
import { Switch } from '../../../../html/components/switch'
import { Admin } from '../../../views/html/admin'
import { SaveButton } from '../../../views/html/save-button'
import { GameClassSkillInput } from '../../../../html/components/game-class-skill-input'

export async function PlayerRestrictionsPage() {
  return (
    <Admin activePage="player-restrictions">
      <form action="" method="post" id="playerRestrictionsForm">
        <div class="admin-panel-set flex flex-col gap-4">
          <RequireEtf2lAccount />
          <MinimumTf2InGameHours />
          <SkillStep />
          <SkillSuggestions />
          <DefaultPlayerSkill />

          <p>
            <SaveButton />
          </p>
        </div>
      </form>
    </Admin>
  )
}

async function RequireEtf2lAccount() {
  const etf2lAccountRequired = await configuration.get('players.etf2l_account_required')
  return (
    <div class="group flex flex-row items-center justify-between">
      <dl>
        <dt>
          <label class="text-abru-light-75" for="etf2lAccountRequired">
            Require ETF2L account
          </label>
        </dt>
        <dd class="text-abru-light-75">
          <span class="hidden group-has-checked:inline-block">
            Players that do not have an ETF2L profile will not be able to register
          </span>
          <span class="group-has-checked:hidden">All players will be able to register</span>
        </dd>
      </dl>

      <Switch
        id="etf2lAccountRequired"
        checked={etf2lAccountRequired}
        name="etf2lAccountRequired"
      />
    </div>
  )
}

async function MinimumTf2InGameHours() {
  const minimumInGameHours = await configuration.get('players.minimum_in_game_hours')
  return (
    <dl>
      <dt>
        <label for="minimumInGameHours">Minimum TF2 in-game hours</label>
      </dt>
      <dd>
        <input
          type="text"
          value={minimumInGameHours.toString()}
          id="minimumInGameHours"
          name="minimumInGameHours"
        />
      </dd>
    </dl>
  )
}

async function SkillStep() {
  const skillStep = await configuration.get('games.skill_step')
  return (
    <dl>
      <dt>
        <label for="skillStep">Skill step</label>
      </dt>
      <dd class="flex flex-col">
        <div>
          <input
            type="number"
            id="skillStep"
            name="skillStep"
            value={skillStep.toString()}
            step="0.1"
            min="0.1"
          />
        </div>
        <p class="text-abru-light-75 text-sm">
          Increment/decrement step when adjusting player skill in the admin panel.
        </p>
      </dd>
    </dl>
  )
}

async function SkillSuggestions() {
  const skillSuggestions = await configuration.get('games.skill_suggestions')
  return (
    <div class="group flex flex-row items-center justify-between">
      <dl>
        <dt>
          <label class="text-abru-light-75" for="skillSuggestions">
            Skill suggestions{' '}
            <span class="text-abru-light-35 text-xs font-normal">experimental</span>
          </label>
        </dt>
        <dd class="text-abru-light-75">
          <span class="hidden group-has-checked:inline-block">
            Skill adjustment suggestions are shown in the admin toolbox
          </span>
          <span class="group-has-checked:hidden">No skill suggestions are shown</span>
        </dd>
      </dl>
      <Switch id="skillSuggestions" checked={skillSuggestions} name="skillSuggestions" />
    </div>
  )
}

async function DefaultPlayerSkill() {
  const defaultPlayerSkill = await configuration.get('games.default_player_skill')
  const skillStep = await configuration.get('games.skill_step')

  return (
    <dl>
      <dt>
        <span class="text-abru-light-75 font-bold">Default player skill</span>
      </dt>
      <dd class="flex flex-col gap-2">
        {(await queues.gamemodesInUse()).map(gamemode => (
          <div class="flex flex-row flex-wrap items-center gap-2">
            <span class="w-16 font-bold">{gamemode}</span>
            {gamemodeConfigs[gamemode].classes.map(({ name: gameClass }) => (
              <GameClassSkillInput
                gameClass={gameClass}
                id={`defaultPlayerSkill-${gamemode}-${gameClass}`}
                label={`Default ${gamemode} skill on ${gameClass}`}
                name={`defaultPlayerSkill.${gamemode}.${gameClass}`}
                value={defaultPlayerSkill[gamemode]?.[gameClass] ?? 1}
                step={skillStep}
              />
            ))}
          </div>
        ))}
        <p class="text-abru-light-75 text-sm">
          If a player starts a game without skill assigned for them, the game balance system will
          use this fallback value.
        </p>
      </dd>
    </dl>
  )
}
