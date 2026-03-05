import { configuration } from '../../../../configuration'
import { Admin } from '../../../views/html/admin'
import { MapVoteOptions } from './map-vote-options'
import { SaveButton } from '../../../views/html/save-button'
import { MapVoteTiming } from '../../../../shared/types/map-vote-timing'
import { millisecondsToSeconds } from 'date-fns'

export async function ScrambleMaps() {
  const mapVoteTiming = await configuration.get('queue.map_vote_timing')
  const mapVoteTimeout = await configuration.get('queue.map_vote_timeout')

  return (
    <Admin activePage="scramble-maps">
      <div class="admin-panel-set">
        <MapVoteOptions />

        <div class="mt-6 flex w-full items-center justify-center">
          <button
            class="button button--accent button--dense"
            hx-put="/admin/scramble-maps/scramble"
            hx-target="#adminPanelMapVoteOptions"
            hx-swap="outerHTML"
          >
            <span>Scramble</span>
          </button>
        </div>
      </div>

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
                />
                <span>Pre-ready (players vote while waiting in the queue)</span>
              </label>
              <label class="flex items-center gap-2">
                <input
                  type="radio"
                  name="mapVoteTiming"
                  value={MapVoteTiming.postReady}
                  checked={mapVoteTiming === MapVoteTiming.postReady}
                />
                <span>Post-ready (players vote after everyone readies up)</span>
              </label>
            </dd>

            <dt class="mt-4">
              <label for="map-vote-timeout" class="font-medium">
                Map vote timeout (seconds)
              </label>
            </dt>
            <dd>
              <input
                type="number"
                id="map-vote-timeout"
                name="mapVoteTimeout"
                value={millisecondsToSeconds(mapVoteTimeout).toString()}
                min="5"
                max="60"
              />
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
