import type { User } from '../../../../auth/types/user'
import { Admin } from '../../../views/html/admin'

export function PlayerRestrictionsPage(props: { user: User }) {
  return (
    <Admin activePage="player-restrictions" user={props.user}>
      <form action="" method="post"></form>
    </Admin>
  )
}
