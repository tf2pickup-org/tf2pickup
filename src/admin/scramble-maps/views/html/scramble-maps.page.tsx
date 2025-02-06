import type { User } from '../../../../auth/types/user'
import { Admin } from '../../../views/html/admin'
import { MapVoteOptions } from './map-vote-options'

export async function ScrambleMaps(props: { user: User }) {
  return (
    <Admin activePage="scramble-maps" user={props.user}>
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
