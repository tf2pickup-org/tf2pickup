import { collections } from '../../../database/collections'
import { environment } from '../../../environment'

export async function SetTitle() {
  const [current, required] = await Promise.all([
          collections.queueSlots.countDocuments({ player: { $ne: null } }),
          collections.queueSlots.countDocuments(),
        ])
  return (
    <div id="queue-notify-container" hx-swap-oob="beforeend">
      <script type="module" remove-me="0s">{`
        document.title='[${current.toString()}/${required.toString()}] ${environment.WEBSITE_NAME}';
      `}</script>
    </div>
  )
}
