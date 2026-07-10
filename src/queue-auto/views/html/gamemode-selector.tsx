import { collections } from '../../../database/collections'
import { enabledGamemodes } from '../../../shared/enabled-gamemodes'
import { gamemodeDisplayName } from '../../../shared/gamemode-display-name'
import type { Gamemode } from '../../../shared/types/gamemode'
import { queuePageUrl } from '../../queue-page-url'

/**
 * The gamemode switcher strip on the queue page: one card per enabled
 * gamemode, showing live queue occupancy. Renders nothing on single-gamemode
 * instances.
 */
export async function GamemodeSelector(props: { active: Gamemode }) {
  if (enabledGamemodes.length <= 1) {
    return <></>
  }

  return (
    <div class="flex flex-col gap-1">
      <span class="text-abru-light-60 text-sm font-bold tracking-wider uppercase">Gamemode</span>
      <div
        class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        role="tablist"
        aria-label="Gamemode"
      >
        {enabledGamemodes.map(gamemode => (
          <a
            class={[
              'relative flex flex-row items-baseline justify-between gap-2 rounded-md border p-4 pb-6',
              gamemode === props.active
                ? 'border-accent-600 bg-abru-dark-29'
                : 'bg-abru-dark-25 hover:bg-abru-dark-29 border-transparent',
            ]}
            role="tab"
            href={queuePageUrl(gamemode)}
            aria-selected={gamemode === props.active ? 'true' : 'false'}
            aria-label={`${gamemodeDisplayName(gamemode)} queue`}
            data-umami-event="switch-queue-gamemode"
            data-umami-event-gamemode={gamemode}
          >
            <span class="font-bold text-white">{gamemodeDisplayName(gamemode)}</span>
            <GamemodeQueueGauge gamemode={gamemode} />
          </a>
        ))}
      </div>
    </div>
  )
}

/**
 * The live part of a gamemode card (occupancy + progress bar). Identical for
 * every client, so it is broadcast as an out-of-band swap on queue updates.
 */
export async function GamemodeQueueGauge(props: { gamemode: Gamemode }) {
  const [current, capacity] = await Promise.all([
    collections.queueSlots.countDocuments({ gamemode: props.gamemode, player: { $ne: null } }),
    collections.queueSlots.countDocuments({ gamemode: props.gamemode }),
  ])
  const full = capacity > 0 && current === capacity

  return (
    <span id={`gamemode-queue-gauge-${props.gamemode}`} class="contents">
      {full ? (
        <span class="text-sm leading-none font-bold text-green-500">READY</span>
      ) : (
        <span class="text-ash text-sm">
          {current}/{capacity}
        </span>
      )}
      <span class="bg-abru-light-15 absolute inset-x-4 bottom-2 h-1 overflow-hidden rounded-xs">
        <span
          class="bg-accent-600 absolute inset-y-0 left-0 rounded-xs"
          style={`width: ${capacity > 0 ? Math.round((current / capacity) * 100).toString() : '0'}%`}
        ></span>
      </span>
    </span>
  )
}
