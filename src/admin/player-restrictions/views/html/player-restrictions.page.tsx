import type { User } from '../../../../auth/types/user'
import { configuration } from '../../../../configuration'
import { Switch } from '../../../../html/components/switch'
import { Admin } from '../../../views/html/admin'

export async function PlayerRestrictionsPage(props: { user: User }) {
  const etf2lAccountRequired = await configuration.get('players.etf2l_account_required')
  const minimumInGameHours = await configuration.get('players.minimum_in_game_hours')
  const denyPlayersWithNoSkillAssigned = await configuration.get(
    'queue.deny_players_with_no_skill_assigned',
  )

  return (
    <Admin activePage="player-restrictions" user={props.user}>
      <form action="" method="post">
        <div class="bg-abru-dark-25 mt-8 flex flex-col gap-4 rounded-2xl p-6">
          <div class="flex flex-row items-center justify-between">
            <dl>
              <dt>
                <label class="text-abru-light-75" for="etf2lAccountRequired">
                  Require ETF2L account
                </label>
              </dt>
              <dd class="text-abru-light-75">
                Players that do not have an ETF2L profile will not be able to register
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

          <div class="flex flex-row items-center justify-between">
            <dl>
              <dt>
                <label class="text-abru-light-75" for="denyPlayersWithNoSkillAssigned">
                  Deny players with no skill assigned
                </label>
              </dt>
              <dd class="text-abru-light-75">
                Players that have no skill assigned will be able to join the queue and the default
                skill will be used for them when launching a game
              </dd>
            </dl>

            <Switch
              id="denyPlayersWithNoSkillAssigned"
              checked={denyPlayersWithNoSkillAssigned}
              name="denyPlayersWithNoSkillAssigned"
            />
          </div>
        </div>

        <button type="submit" class="button button--accent mt-6">
          Save
        </button>
      </form>
    </Admin>
  )
}
