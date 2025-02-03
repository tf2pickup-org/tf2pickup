import type { User } from '../../../../auth/types/user'
import { IconPlus } from '../../../../html/components/icons'
import { Admin } from '../../../views/html/admin'
import { BypassedSteamIds } from './bypassed-steam-ids'

export function BypassRegistrationRestrictionsPage(props: { user: User }) {
  return (
    <Admin activePage="bypass-registration-restrictions" user={props.user}>
      <div class="admin-panel-set">
        <p>
          Allow users to register without checking if they meet the criteria described in the{' '}
          <a href="/admin/player-restrictions">player restrictions page</a>.
        </p>

        <BypassedSteamIds />

        <form method="post" action="" class="row flex items-center gap-2">
          <input type="text" name="steamId" />
          <button type="submit" class="button button--accent button--dense">
            <IconPlus size={20} />
            <span>Add user Steam ID</span>
          </button>
        </form>
      </div>
    </Admin>
  )
}
