import { collections } from '../../../database/collections'
import { environment } from '../../../environment'
import type { Gamemode } from '../../../shared/types/gamemode'

export async function SetTitle(props: { gamemode: Gamemode }) {
  const [current, required] = await Promise.all([
    collections.queueSlots.countDocuments({ gamemode: props.gamemode, player: { $ne: null } }),
    collections.queueSlots.countDocuments({ gamemode: props.gamemode }),
  ])
  return (
    <div id="queue-notify-container" hx-swap-oob="beforeend">
      <script type="module" remove-me="0s">{`
        document.title='[${current.toString()}/${required.toString()}] ${environment.WEBSITE_NAME}';
      `}</script>
    </div>
  )
}
