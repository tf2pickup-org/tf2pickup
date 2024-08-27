import type { User } from '../../../../auth/types/user'
import { Admin } from '../../../views/html/admin'

export function DiscordPage(props: { user: User }) {
  return (
    <Admin activePage="discord" user={props.user}>
      <div class="admin-panel-set"></div>
    </Admin>
  )
}
