import type { QueueModel } from '../../../../database/models/queue.model'
import { environment } from '../../../../environment'
import { playerCounts } from '../../../player-counts'

export async function SetTitle(props: { queue: QueueModel }) {
  const { current, required } = await playerCounts(props.queue)
  return (
    <div id="queue-notify-container" hx-swap-oob="beforeend">
      <script type="module" remove-me="0s">{`
        document.title='[${current.toString()}/${required.toString()}] ${environment.WEBSITE_NAME}';
      `}</script>
    </div>
  )
}
