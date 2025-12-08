import { Admin } from '../../../views/html/admin'
import { MapVoteOptions } from './map-vote-options'

export async function ScrambleMaps() {
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
    </Admin>
  )
}
