import { collections } from '../../../../database/collections'
import type { QueueModel } from '../../../../database/models/queue.model'
import { environment } from '../../../../environment'
import { queuePageUrl } from '../../../queue-page-url'

// The update can land after the player has left the queue page (e.g. the redirect to a freshly
// launched game), so it only applies while that queue's page is still the one shown.
export async function SetTitle(props: { queue: QueueModel }) {
  const [current, required] = await Promise.all([
    collections.queueSlots.countDocuments({ queue: props.queue._id, player: { $ne: null } }),
    collections.queueSlots.countDocuments({ queue: props.queue._id }),
  ])
  return (
    <div id="queue-notify-container" hx-swap-oob="beforeend">
      <script type="module" remove-me="0s">{`
        if (location.pathname === ${JSON.stringify(queuePageUrl(props.queue.slug))}) {
          document.title='[${current.toString()}/${required.toString()}] ${environment.WEBSITE_NAME}';
        }
      `}</script>
    </div>
  )
}
