import { nanoid } from 'nanoid'
import { millisecondsToSeconds } from 'date-fns'
import { players } from '../../../../players'
import type { SteamId64 } from '../../../../shared/types/steam-id-64'

// The sound and notification of "your pick": the page plays them only while its tab is unfocused.
export async function CaptainTurnNotice(props: {
  actor: SteamId64
  title: string
  deadline: Date
}) {
  const { preferences } = await players.bySteamId(props.actor, ['preferences.soundVolume'])
  const seconds = Math.max(
    0,
    Math.ceil(millisecondsToSeconds(props.deadline.getTime() - Date.now())),
  )
  return (
    <div id="notify-container" hx-swap-oob="beforeend">
      <div
        id={nanoid()}
        remove-me="5s"
        data-when-unfocused
        notification-title={props.title}
        notification-body={`${seconds}s left`}
        notification-icon="/favicon.png"
        data-sound-play="sound-ready-up"
        data-sound-volume={preferences.soundVolume ?? 1.0}
      ></div>
    </div>
  )
}
