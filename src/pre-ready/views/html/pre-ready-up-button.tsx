import { IconCoffee } from '../../../html/components/icons'
import type { SteamId64 } from '../../../shared/types/steam-id-64'
import { players } from '../../../players'

export async function PreReadyUpButton(props: { actor?: SteamId64 | undefined }) {
  if (!props.actor) {
    return <></>
  }

  const player = await players.bySteamId(props.actor, ['preReadyUntil'])
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
      sync-attr:disabled="#isInQueue.value === false"
      aria-selected={timeLeft > 0}
      data-umami-event={timeLeft > 0 ? 'pre-ready-up-cancel' : 'pre-ready-up'}
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

function formatTimeout(ms: number) {
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return seconds === 60
    ? (minutes + 1).toString() + ':00'
    : minutes.toString() + ':' + (seconds < 10 ? '0' : '') + seconds.toString()
}
