import type { User } from '../../../../auth/types/user'
import { servemeTf } from '../../../../serveme-tf'
import { Admin } from '../../../views/html/admin'
import { ServemeTfPreferredRegion } from './serveme-tf-preferred-region'
import { ServemeTfStatus } from './serveme-tf-status'
import { StaticGameServerList } from './static-game-server-list'

export async function GameServersPage(props: { user: User }) {
  return (
    <Admin activePage="game-servers" user={props.user}>
      <div class="admin-panel-set">
        <h4 class="pb-4">Static servers</h4>
        <StaticGameServerList />
      </div>

      <div class="admin-panel-set mt-4">
        <div class="flex flex-row gap-2">
          <h4 class="pb-4">serveme.tf</h4>
          <ServemeTfStatus />
        </div>

        {servemeTf.isEnabled && <ServemeTfPreferredRegion />}
      </div>
    </Admin>
  )
}
