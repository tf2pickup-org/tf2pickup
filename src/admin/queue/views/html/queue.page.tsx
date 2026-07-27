import { configuration } from '../../../../configuration'
import { IconAlertSquareRounded } from '../../../../html/components/icons'
import { canChangeMode } from '../../../../queue-captains/can-change-mode'
import { QueueMode } from '../../../../shared/types/queue-mode'
import { Admin } from '../../../views/html/admin'
import { SaveButton } from '../../../views/html/save-button'

const modeLabels: Record<QueueMode, { title: string; description: string }> = {
  [QueueMode.auto]: {
    title: 'Automatic teams',
    description: 'Players take a single class slot and teams are balanced by skill average.',
  },
  [QueueMode.captains]: {
    title: 'Captains',
    description:
      'Players sign up on several classes at once and two captains draft the teams by hand.',
  },
}

export async function AdminQueuePage() {
  const [mode, minGames, changeable] = await Promise.all([
    configuration.get('queue.mode'),
    configuration.get('queue.captains.min_games'),
    canChangeMode(),
  ])

  return (
    <Admin activePage="queue">
      <form action="" method="post">
        <div class="admin-panel-set flex flex-col gap-4">
          {!changeable.allowed && (
            <p class="bg-abru-dark-25 text-abru-light-75 flex items-center gap-2 rounded-lg px-4 py-3 text-sm">
              <IconAlertSquareRounded size={20} />
              <span safe>The queue mode is locked: {changeable.reason}.</span>
            </p>
          )}

          <dl>
            <dt>
              <label for="mode">Queue mode</label>
            </dt>
            <dd class="flex flex-col gap-1">
              <select name="mode" id="mode" disabled={!changeable.allowed}>
                {Object.values(QueueMode).map(value => (
                  <option value={value} selected={mode === value} safe>
                    {modeLabels[value].title}
                  </option>
                ))}
              </select>
              <span class="text-abru-light-75 text-sm" safe>
                {modeLabels[mode].description}
              </span>
            </dd>
          </dl>

          <dl>
            <dt>
              <label for="captainsMinGames">Games needed to captain</label>
            </dt>
            <dd class="flex flex-col">
              <input
                type="number"
                name="captainsMinGames"
                id="captainsMinGames"
                min="0"
                value={minGames.toString()}
              />
              <span class="text-abru-light-75 text-sm">
                How many games a player must have played before they can volunteer as captain. Only
                used in captain mode.
              </span>
            </dd>
          </dl>

          <p class="mt-8">
            <SaveButton />
          </p>
        </div>
      </form>
    </Admin>
  )
}
