import type { User } from '../../../../auth/types/user'
import { Admin } from '../../../views/html/admin'

export function GameServersPage(props: { user: User }) {
  return (
    <Admin activePage="game-servers" user={props.user}>
      <div class="admin-panel-set"></div>
    </Admin>
  )
}
