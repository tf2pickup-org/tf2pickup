import { tf2QuickServer } from '../../../../tf2-quick-server'
import { Admin } from '../../../views/html/admin'
import { HideServerInfoSetting } from './hide-server-info-setting'
import { ServemeTfSettings } from './serveme-tf-settings'
import { StaticGameServerList } from './static-game-server-list'
import { Tf2QuickServerRegion } from './tf2-quick-server-region'
import { Tf2QuickServerStatus } from './tf2-quick-server-status'

export async function GameServersPage() {
  return (
    <Admin activePage="game-servers">
      <div class="admin-panel-set">
        <h4 class="pb-4">General</h4>
        <HideServerInfoSetting />
      </div>

      <div class="admin-panel-set mt-4">
        <h4 class="pb-4">Static servers</h4>
        <div class="max-lg:overflow-x-auto">
          <StaticGameServerList />
        </div>
      </div>

      <div class="admin-panel-set mt-4">
        <ServemeTfSettings />
      </div>

      <div class="admin-panel-set mt-4">
        <div class="flex flex-row gap-2">
          <h4>TF2 QuickServer</h4>
          <Tf2QuickServerStatus />
        </div>

        {tf2QuickServer.isEnabled && <Tf2QuickServerRegion />}
      </div>
    </Admin>
  )
}
