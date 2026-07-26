import type { User } from '../../../auth/types/user'
import { PlayerRole } from '../../../database/models/player.model'
import { IconEraser } from '../../../html/components/icons'

export async function ClearQueueButton(props: { actor?: User | undefined }) {
  if (!props.actor?.player.roles.includes(PlayerRole.admin)) {
    return <></>
  }

  return (
    <button
      class="button max-lg:flex-1 max-lg:px-3 max-lg:text-sm max-lg:whitespace-nowrap"
      data-variant="accent"
      data-umami-event="clear-queue"
      hx-delete="/queue/players"
      hx-confirm="Are you sure you want to kick everyone from the queue?"
    >
      <IconEraser />
      <span>Clear queue</span>
    </button>
  )
}
