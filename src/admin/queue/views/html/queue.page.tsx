import { configuration } from '../../../../configuration'
import { Admin } from '../../../views/html/admin'
import { SaveButton } from '../../../views/html/save-button'
import { MapVoteTiming } from '../../../../shared/types/map-vote-timing'
import { millisecondsToSeconds } from 'date-fns'

export async function QueuePage() {
  const mapVoteTiming = await configuration.get('queue.map_vote_timing')
  const mapVoteTimeout = await configuration.get('queue.map_vote_timeout')

  return (
    <Admin activePage="queue">
      <form action="" method="post">
        <div class="admin-panel-set">
          <dl>
            <dt>
              <label class="font-medium">Map vote timing</label>
            </dt>
            <dd class="flex flex-col gap-2">
              <label class="flex items-center gap-2">
                <input
                  type="radio"
                  name="mapVoteTiming"
                  value={MapVoteTiming.preReady}
                  checked={mapVoteTiming === MapVoteTiming.preReady}
                  _={`on change set #map-vote-timeout.disabled to true`}
                />
                <span>Pre-ready (players vote while waiting in the queue)</span>
              </label>
              <label class="flex items-center gap-2">
                <input
                  type="radio"
                  name="mapVoteTiming"
                  value={MapVoteTiming.postReady}
                  checked={mapVoteTiming === MapVoteTiming.postReady}
                  _={`on change set #map-vote-timeout.disabled to false`}
                />
                <span>Post-ready (players vote after everyone readies up)</span>
              </label>
              <div class="pl-6">
                <label for="map-vote-timeout" class="flex items-center gap-2 text-sm">
                  <span class="text-nowrap">Map vote timeout (seconds)</span>
                  <input
                    type="number"
                    id="map-vote-timeout"
                    name="mapVoteTimeout"
                    value={millisecondsToSeconds(mapVoteTimeout).toString()}
                    min="5"
                    max="60"
                    disabled={mapVoteTiming === MapVoteTiming.preReady}
                    class="w-20"
                  />
                </label>
              </div>
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
