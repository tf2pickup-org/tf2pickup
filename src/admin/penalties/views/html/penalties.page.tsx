import { secondsToMilliseconds } from 'date-fns'
import { configuration } from '../../../../configuration'
import { GameClassIcon } from '../../../../html/components/game-class-icon'
import { IconPlus } from '../../../../html/components/icons'
import { Tf2ClassName } from '../../../../shared/types/tf2-class-name'
import { durationUnit } from '../../../games/duration-unit'
import { Admin } from '../../../views/html/admin'
import { DurationInput } from '../../../views/html/duration-input'
import { SaveBar } from '../../../views/html/save-bar'
import { SettingCard } from '../../../views/html/setting-card'
import { SettingRow } from '../../../views/html/setting-row'
import { CooldownLevelEntry } from './cooldown-level-entry'

export async function PenaltiesPage() {
  const [cooldownLevels, cooldownDecayPeriod, joinQueueCooldown] = await Promise.all([
    configuration.get('games.cooldown_levels'),
    configuration.get('games.cooldown_decay_period'),
    configuration.get('games.join_queue_cooldown'),
  ])

  return (
    <Admin activePage="penalties">
      <form action="/admin/penalties" method="post" class="flex flex-col gap-4" data-save-bar>
        <SettingCard
          title="Cooldown bans"
          description="When a player is subbed out of a game, they receive a ban. The ban length grows with each offence, following the levels below."
        >
          <SettingRow
            label="Cooldown levels"
            configKey="games.cooldown_levels"
            description="Levels are applied top to bottom; a player past the last level always gets the last ban length."
          >
            <div class="cooldown-levels-list flex flex-col gap-2" id="cooldownLevelsList">
              {cooldownLevels.map(({ banLengthMs }) => (
                <CooldownLevelEntry banLengthMs={banLengthMs} />
              ))}
            </div>
            <button
              type="button"
              class="flex w-fit flex-row items-center gap-2 text-white hover:underline"
              data-umami-event="add-cooldown-level"
              hx-post="/admin/penalties/cooldown-level"
              hx-trigger="click"
              hx-target="#cooldownLevelsList"
              hx-swap="beforeend"
            >
              <IconPlus />
              Add level
            </button>
          </SettingRow>

          <SettingRow
            label="Cooldown level decay"
            for="cooldownDecayPeriod"
            configKey="games.cooldown_decay_period"
            defaultLabel={durationUnit.label(
              configuration.getDefault('games.cooldown_decay_period'),
            )}
            description="Every period without a new offence, a player's cooldown level drops by one, so old offences stop counting. Use 0 to disable decay."
          >
            <DurationInput
              id="cooldownDecayPeriod"
              name="cooldownDecayPeriod"
              valueMs={cooldownDecayPeriod}
            />
          </SettingRow>
        </SettingCard>

        <SettingCard
          title="Join-queue cooldown"
          description="How long a player has to wait after a game ends before they can join the queue again, per class. Useful for giving others a turn on popular classes."
        >
          <SettingRow
            label="Wait per class"
            configKey="games.join_queue_cooldown"
            description="In seconds. Use 0 for no wait."
          >
            <div class="grid grid-cols-3 gap-2">
              {Object.values(Tf2ClassName).map(gameClass => (
                <div class="flex flex-row items-center gap-2">
                  <GameClassIcon gameClass={gameClass} size={32} />
                  <label for={`joinQueueCooldown-${gameClass}`} class="sr-only" safe>
                    {`Join queue cooldown for ${gameClass}`}
                  </label>
                  <input
                    type="number"
                    id={`joinQueueCooldown-${gameClass}`}
                    name={`joinQueueCooldown.${gameClass}`}
                    value={(joinQueueCooldown[gameClass] / secondsToMilliseconds(1)).toString()}
                    min="0"
                    step="any"
                    required
                    class="min-w-0 flex-1"
                  />
                </div>
              ))}
            </div>
          </SettingRow>
        </SettingCard>

        <SaveBar />
      </form>
    </Admin>
  )
}
