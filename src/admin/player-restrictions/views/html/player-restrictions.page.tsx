import { configuration } from '../../../../configuration'
import { Switch } from '../../../../html/components/switch'
import { queue } from '../../../../queue'
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
          <DenyPlayersWithNoSkillAssigned />
          <PlayerSkillThreshold />
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
          <span class="hidden group-has-[:checked]:inline-block">
            Players that do not have an ETF2L profile will not be able to register
          </span>
          <span class="group-has-[:checked]:hidden">All players will be able to register</span>
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

async function DenyPlayersWithNoSkillAssigned() {
  const denyPlayersWithNoSkillAssigned = await configuration.get(
    'queue.deny_players_with_no_skill_assigned',
  )
  return (
    <div class="group flex flex-row items-center justify-between">
      <dl>
        <dt>
          <label class="text-abru-light-75" for="denyPlayersWithNoSkillAssigned">
            Deny players with no skill assigned
          </label>
        </dt>
        <dd class="text-abru-light-75">
          <span class="hidden group-has-[:checked]:inline-block">
            Players with no skill assigned won't be allowed to join the queue
          </span>
          <span class="group-has-[:checked]:hidden">
            Players that have no skill assigned will be able to join the queue and the default skill
            will be used for them when launching a game
          </span>
        </dd>
      </dl>

      <Switch
        id="denyPlayersWithNoSkillAssigned"
        checked={denyPlayersWithNoSkillAssigned}
        name="denyPlayersWithNoSkillAssigned"
      />
    </div>
  )
}

async function PlayerSkillThreshold() {
  const playerSkillThreshold = await configuration.get('queue.player_skill_threshold')
  const playerSkillThresholdEnabled = playerSkillThreshold !== null

  return (
    <dl>
      <dt class="group flex flex-row gap-2">
        <label for="playerSkillThresholdEnabled">Player skill threshold</label>
        <input
          type="checkbox"
          id="playerSkillThresholdEnabled"
          name="playerSkillThresholdEnabled"
          value="enabled"
          checked={playerSkillThresholdEnabled}
        />
        <span class="hidden group-has-[:checked]:inline-block">enabled</span>
        <span class="group-has-[:checked]:hidden">disabled</span>
      </dt>
      <dd class="flex flex-col">
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
            _={`
                    on change from #playerRestrictionsForm
                      if #playerRestrictionsForm.playerSkillThresholdEnabled.checked
                        remove [@disabled]
                      else
                        add [@disabled]
                      end
                  `}
          />
        </div>
        <p class="text-sm text-abru-light-75">
          Players will be able to join queue only on classes that meet the given criteria.
        </p>
      </dd>
    </dl>
  )
}

async function DefaultPlayerSkill() {
  const defaultPlayerSkill = await configuration.get('games.default_player_skill')
  const classes = queue.config.classes.map(({ name }) => name)

  return (
    <dl>
      <dt>
        <span class="font-bold text-abru-light-75">Default player skill</span>
      </dt>
      <dd class="flex flex-col">
        <div class="flex flex-row gap-2">
          {classes.map(gameClass => (
            <GameClassSkillInput
              gameClass={gameClass}
              name={`defaultPlayerSkill.${gameClass}`}
              value={defaultPlayerSkill[gameClass] ?? 1}
            />
          ))}
        </div>
        <p class="text-sm text-abru-light-75">
          If a player starts a game without skill assigned for them, the game balance system will
          use this fallback value.
        </p>
      </dd>
    </dl>
  )
}
