import { players } from '../../../players'
import type { SteamId64 } from '../../../shared/types/steam-id-64'

export async function ChatMentionNotification(actor: SteamId64) {
  const player = await players.bySteamId(actor, ['preferences.soundVolume'])
  const volume = player.preferences.soundVolume ?? 1.0
  return (
    <div id="notify-container" hx-swap-oob="beforeend">
      <script
        type="module"
        remove-me="0s"
      >{`document.dispatchEvent(new CustomEvent('chat:mentioned', { detail: { volume: ${volume} } }));`}</script>
    </div>
  )
}
