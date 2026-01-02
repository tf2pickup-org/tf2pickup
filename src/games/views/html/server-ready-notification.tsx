import { nanoid } from 'nanoid'
import { players } from '../../../players'
import type { SteamId64 } from '../../../shared/types/steam-id-64'

export async function ServerReadyNotification(actor: SteamId64) {
  const player = await players.bySteamId(actor, ['preferences.soundVolume'])
  const id = nanoid()
  return (
    <div id="notify-container" hx-swap-oob="beforeend">
      <div
        id={id}
        play-sound-src="/sounds/fight.webm"
        play-sound-volume={player.preferences.soundVolume ?? '1.0'}
      ></div>
      <script>{`document.getElementById('${id}').dispatchEvent(new CustomEvent('tf2pickup:soundPlay'))`}</script>
    </div>
  )
}
