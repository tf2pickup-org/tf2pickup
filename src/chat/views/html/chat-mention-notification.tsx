import { players } from '../../../players'
import type { SteamId64 } from '../../../shared/types/steam-id-64'

export async function ChatMentionNotification(actor: SteamId64) {
  const player = await players.bySteamId(actor, ['preferences.soundVolume'])
  return (
    <div id="notify-container" hx-swap-oob="beforeend">
      <div
        play-sound-src="/sounds/mention.webm"
        play-sound-volume={player.preferences.soundVolume ?? '1.0'}
      ></div>
      <script
        type="module"
        remove-me="0s"
      >{`document.dispatchEvent(new CustomEvent('chat:mentioned'));`}</script>
    </div>
  )
}
