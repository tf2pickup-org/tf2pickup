import { configuration } from '../../../../configuration'
import { Admin } from '../../../views/html/admin'
import { SaveButton } from '../../../views/html/save-button'
import { millisecondsToSeconds } from 'date-fns'

export async function QueueConfigPage() {
  const mode = await configuration.get('queue.mode')
  const captainMinGames = await configuration.get('queue.captain_min_games')
  const captainPickTimeout = await configuration.get('queue.captain_pick_timeout')

  return (
    <Admin activePage="queue">
      <form action="" method="post">
        <div class="admin-panel-set flex flex-col gap-4">
          <dl>
            <dt>Queue mode</dt>
            <dd class="flex flex-col gap-2">
              <label class="flex items-center gap-2">
                <input type="radio" name="mode" value="auto" checked={mode === 'auto'} />
                <span class="text-white">Auto</span>
              </label>
              <label class="flex items-center gap-2">
                <input type="radio" name="mode" value="captain" checked={mode === 'captain'} />
                <span class="text-white">Captain</span>
              </label>
            </dd>
          </dl>

          <dl>
            <dt>
              <label for="captainMinGames">Captain min games</label>
            </dt>
            <dd class="flex flex-col">
              <input
                type="number"
                name="captainMinGames"
                id="captainMinGames"
                value={captainMinGames.toString()}
                min="0"
              />
              <span class="text-abru-light-75 text-sm">
                Minimum number of games a player needs to be eligible as captain.
              </span>
            </dd>
          </dl>

          <dl>
            <dt>
              <label for="captainPickTimeout">Captain pick timeout</label>
            </dt>
            <dd class="flex flex-col">
              <div>
                <input
                  type="number"
                  name="captainPickTimeout"
                  id="captainPickTimeout"
                  value={millisecondsToSeconds(captainPickTimeout).toString()}
                  min="10"
                  class="me-2"
                />
                <span class="text-white">seconds</span>
              </div>
              <span class="text-abru-light-75 text-sm">
                Time each captain has to make a pick or map ban before an automatic pick is made.
              </span>
            </dd>
          </dl>

          <p class="mt-2">
            <SaveButton />
          </p>
        </div>
      </form>
    </Admin>
  )
}
