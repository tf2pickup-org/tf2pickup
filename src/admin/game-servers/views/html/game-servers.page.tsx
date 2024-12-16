import type { User } from '../../../../auth/types/user'
import { Admin } from '../../../views/html/admin'
import { StaticGameServerList } from './static-game-server-list'

export async function GameServersPage(props: { user: User }) {
  return (
    <Admin activePage="game-servers" user={props.user}>
      <div class="admin-panel-set">
        <h4 class="pb-4">Static servers</h4>
        <StaticGameServerList />
      </div>
    </Admin>
  )
}
