import { collections } from '../../../database/collections'
import { enabledGamemodes } from '../../../shared/enabled-gamemodes'
import { gamemodeDisplayName } from '../../../shared/gamemode-display-name'
import { Gamemode } from '../../../shared/types/gamemode'
import { queuePageUrl } from '../../queue-page-url'

const queueTarget = '#queue'
// Keep the page shell mounted while refreshing the other gamemode-bound controls.
const queueRelatedTargets =
  '#gamemode-selector,#queue-state,#map-vote,#isInQueue,#mapVoteSelection,#queue-tab-label'
const gamemodeOrder = [Gamemode.sixes, Gamemode.highlander, Gamemode.ultiduo, Gamemode.bball]

/**
 * The gamemode switcher strip on the queue page: one card per enabled
 * gamemode, showing live queue occupancy. Renders nothing on single-gamemode
 * instances.
 */
export async function GamemodeSelector(props: { active: Gamemode }) {
  if (enabledGamemodes.length <= 1) {
    return <></>
  }

  const displayedGamemodes = gamemodeOrder.filter(gamemode => enabledGamemodes.includes(gamemode))

  return (
    <nav id="gamemode-selector" class="gamemode-selector" aria-label="Gamemode">
      <div class="gamemode-options">
        {displayedGamemodes.map(gamemode => (
          <a
            class="gamemode-option"
            href={queuePageUrl(gamemode)}
            hx-target={queueTarget}
            hx-select={queueTarget}
            hx-select-oob={queueRelatedTargets}
            hx-swap="outerHTML show:none"
            aria-current={gamemode === props.active ? 'page' : undefined}
            aria-label={`${gamemodeDisplayName(gamemode)} queue`}
            data-umami-event="switch-queue-gamemode"
            data-umami-event-gamemode={gamemode}
          >
            <span safe>{gamemodeDisplayName(gamemode)}</span>
            <GamemodeQueueGauge gamemode={gamemode} />
          </a>
        ))}
      </div>
    </nav>
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
      <span class="sr-only" safe>
        {full ? 'Ready' : `${current}/${capacity} players`}
      </span>
    </span>
  )
}
