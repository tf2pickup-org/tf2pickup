import type { User } from '../../../../auth/types/user'
import { configuration } from '../../../../configuration'
import { Switch } from '../../../../html/components/switch'
import { Admin } from '../../../views/html/admin'
import { SaveButton } from '../../../views/html/save-button'

export async function PlayerRestrictionsPage(props: { user: User }) {
  const etf2lAccountRequired = await configuration.get('players.etf2l_account_required')
  const minimumInGameHours = await configuration.get('players.minimum_in_game_hours')
  const denyPlayersWithNoSkillAssigned = await configuration.get(
    'queue.deny_players_with_no_skill_assigned',
  )

  return (
    <Admin activePage="player-restrictions" user={props.user}>
      <form action="" method="post">
        <div class="admin-panel-set flex flex-col gap-4">
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
                <span class="group-has-[:checked]:hidden">
                  All players will be able to register
                </span>
              </dd>
            </dl>

            <Switch
              id="etf2lAccountRequired"
              checked={etf2lAccountRequired}
              name="etf2lAccountRequired"
            />
          </div>

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
                  Players that have no skill assigned will be able to join the queue and the default
                  skill will be used for them when launching a game
                </span>
              </dd>
            </dl>

            <Switch
              id="denyPlayersWithNoSkillAssigned"
              checked={denyPlayersWithNoSkillAssigned}
              name="denyPlayersWithNoSkillAssigned"
            />
          </div>

          <p>
            <SaveButton />
          </p>
        </div>
      </form>
    </Admin>
  )
}
