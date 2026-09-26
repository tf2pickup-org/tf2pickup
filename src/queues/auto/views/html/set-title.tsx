import { collections } from '../../../../database/collections'
import type { QueueId } from '../../../../database/models/queue.model'
import { environment } from '../../../../environment'

export async function SetTitle(props: { queue: QueueId }) {
  const [current, required] = await Promise.all([
    collections.queueSlots.countDocuments({ queue: props.queue, player: { $ne: null } }),
    collections.queueSlots.countDocuments({ queue: props.queue }),
  ])
  return (
    <div id="queue-notify-container" hx-swap-oob="beforeend">
      <script type="module" remove-me="0s">{`
        document.title='[${current.toString()}/${required.toString()}] ${environment.WEBSITE_NAME}';
      `}</script>
    </div>
  )
}
