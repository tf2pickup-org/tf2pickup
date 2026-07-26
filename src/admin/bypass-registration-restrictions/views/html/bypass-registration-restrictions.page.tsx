import { IconPlus } from '../../../../html/components/icons'
import { Admin } from '../../../views/html/admin'
import { BypassedSteamIds } from './bypassed-steam-ids'

export function BypassRegistrationRestrictionsPage() {
  return (
    <Admin activePage="bypass-registration-restrictions">
      <div class="admin-panel-set">
        <p>
          Allow users to register without checking if they meet the criteria described in the{' '}
          <a href="/admin/player-restrictions">player restrictions page</a>.
        </p>

        <BypassedSteamIds />

        <form method="post" action="" class="row flex items-center gap-2 max-lg:flex-wrap">
          <input type="text" name="steamId" class="max-lg:w-full max-lg:min-w-0" />
          <button
            type="submit"
            class="button whitespace-nowrap"
            data-variant="accent"
            data-size="dense"
          >
            <IconPlus size={20} />
            <span>Add user Steam ID</span>
          </button>
        </form>
      </div>
    </Admin>
  )
}
