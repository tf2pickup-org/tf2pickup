import { nanoid } from 'nanoid'
import { IconCoffee } from '../../../html/components/icons'
import { collections } from '../../../database/collections'
import type { SteamId64 } from '../../../shared/types/steam-id-64'

export async function PreReadyUpButton(props: { actor?: SteamId64 | undefined }) {
  if (!props.actor) {
    return <></>
  }

  const isInQueue = (await collections.queueSlots.countDocuments({ player: props.actor })) > 0
  const player = await collections.players.findOne({ steamId: props.actor })
  if (player === null) {
    throw new Error(`player ${props.actor} not found`)
  }

  const timeLeft = player.preReadyUntil
    ? Math.max(player.preReadyUntil.getTime() - Date.now(), 0)
    : 0

  return (
    <button
      class="button button--lighter min-w-[200px]"
      id="pre-ready-up-button"
      name="prereadytoggle"
      ws-send
      hx-trigger="click"
      disabled={!isInQueue}
      aria-selected={timeLeft > 0}
    >
      <IconCoffee />
      <div class="flex-1">
        {timeLeft > 0 ? (
          <>
            <span data-countdown={timeLeft} safe>
              {formatTimeout(timeLeft)}
            </span>
            <span class="sr-only">Pre-ready up</span>
          </>
        ) : (
          <span>Pre-ready up</span>
        )}
      </div>
    </button>
  )
}

PreReadyUpButton.enable = () => {
  const id = nanoid()
  return (
    <div id="notify-container" hx-swap-oob="beforeend">
      <script type="module" id={id} remove-me="0s">{`
        document.getElementById('pre-ready-up-button').disabled = false;
      `}</script>
    </div>
  )
}

PreReadyUpButton.disable = () => {
  const id = nanoid()
  return (
    <div id="notify-container" hx-swap-oob="beforeend">
      <script type="module" id={id} remove-me="0s">{`
        document.getElementById('pre-ready-up-button').disabled = true;
      `}</script>
    </div>
  )
}

function formatTimeout(ms: number) {
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return seconds === 60 ? minutes + 1 + ':00' : minutes + ':' + (seconds < 10 ? '0' : '') + seconds
}
