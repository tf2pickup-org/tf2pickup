import { servemeTf } from '../../../../serveme-tf'
import { Admin } from '../../../views/html/admin'
import { ServemeTfBanGameServers } from './serveme-tf-ban-gameservers'
import { ServemeTfPreferredRegion } from './serveme-tf-preferred-region'
import { ServemeTfStatus } from './serveme-tf-status'
import { StaticGameServerList } from './static-game-server-list'

export async function GameServersPage() {
  return (
    <Admin activePage="game-servers">
      <div class="admin-panel-set">
        <h4 class="pb-4">Static servers</h4>
        <StaticGameServerList />
      </div>

      <div class="admin-panel-set mt-4">
        <div class="flex flex-row gap-2">
          <h4>serveme.tf</h4>
          <ServemeTfStatus />
        </div>

        {servemeTf.isEnabled && (
          <>
            <ServemeTfPreferredRegion />
            <ServemeTfBanGameServers />
          </>
        )}
      </div>
    </Admin>
  )
}
