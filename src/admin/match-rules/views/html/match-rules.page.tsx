import { configuration } from '../../../../configuration'
import { durationUnit } from '../../../games/duration-unit'
import { Admin } from '../../../views/html/admin'
import { DurationInput } from '../../../views/html/duration-input'
import { SaveBar } from '../../../views/html/save-bar'
import { SettingCard } from '../../../views/html/setting-card'
import { SettingRow } from '../../../views/html/setting-row'

const connectUnits = ['seconds', 'minutes'] as const

export async function MatchRulesPage() {
  const [joinGameServerTimeout, rejoinGameServerTimeout, autoForceEndThreshold] = await Promise.all(
    [
      configuration.get('games.join_gameserver_timeout'),
      configuration.get('games.rejoin_gameserver_timeout'),
      configuration.get('games.auto_force_end_threshold'),
    ],
  )

  return (
    <Admin activePage="match-rules">
      <form action="/admin/match-rules" method="post" class="flex flex-col gap-4" data-save-bar>
        <SettingCard title="Connecting">
          <SettingRow
            label="Join gameserver timeout"
            for="joinGameserverTimeout"
            configKey="games.join_gameserver_timeout"
            defaultLabel={durationUnit.label(
              configuration.getDefault('games.join_gameserver_timeout'),
            )}
            description="How long a player has to join the gameserver before they are subbed automatically. Use 0 to disable."
          >
            <DurationInput
              id="joinGameserverTimeout"
              name="joinGameserverTimeout"
              valueMs={joinGameServerTimeout}
              units={connectUnits}
            />
          </SettingRow>

          <SettingRow
            label="Rejoin gameserver timeout"
            for="rejoinGameserverTimeout"
            configKey="games.rejoin_gameserver_timeout"
            defaultLabel={durationUnit.label(
              configuration.getDefault('games.rejoin_gameserver_timeout'),
            )}
            description="How long a player has to come back after they go offline during the match. Use 0 to disable."
          >
            <DurationInput
              id="rejoinGameserverTimeout"
              name="rejoinGameserverTimeout"
              valueMs={rejoinGameServerTimeout}
              units={connectUnits}
            />
          </SettingRow>
        </SettingCard>

        <SettingCard title="Substitutes">
          <SettingRow
            label="Auto force-end threshold"
            for="autoForceEndThreshold"
            configKey="games.auto_force_end_threshold"
            defaultLabel={configuration.getDefault('games.auto_force_end_threshold').toString()}
            description="Once this many substitute requests are open at the same time, the game is force-ended automatically."
          >
            <input
              type="number"
              id="autoForceEndThreshold"
              name="autoForceEndThreshold"
              value={autoForceEndThreshold.toString()}
              min="1"
              required
            />
          </SettingRow>
        </SettingCard>

        <SaveBar />
      </form>
    </Admin>
  )
}
