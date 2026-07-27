import { collections } from '../../../database/collections'
import { GameClassIcon } from '../../../html/components/game-class-icon'
import { IconCrown, IconLock } from '../../../html/components/icons'
import { players } from '../../../players'
import { config } from '../../../queue-auto/config'
import type { SteamId64 } from '../../../shared/types/steam-id-64'
import { canCaptain } from '../../can-captain'

/**
 * The player's own controls: which classes they are up for, and whether they want to captain.
 * Deselecting the last class leaves the queue, so there is no separate leave button.
 */
export async function ClassPicker(props: { actor?: SteamId64 | undefined }) {
  if (!props.actor) {
    return <div id="class-picker"></div>
  }

  const [entry, player] = await Promise.all([
    collections.queueCaptainsPool.findOne({ 'player.steamId': props.actor }),
    players.bySteamId(props.actor, ['stats']),
  ])
  const selected = new Set(entry?.gameClasses ?? [])
  const eligibility = await canCaptain(player)

  return (
    <div id="class-picker" class="class-picker">
      <span class="class-picker-title">
        {selected.size > 0 ? "You're in — playing as" : 'Pick the classes you can play'}
      </span>

      <form class="class-picker-classes" ws-send data-disable-when-offline>
        {config.classes.map(({ name: gameClass }) => (
          <button
            class="class-toggle"
            name="captainsclass"
            value={gameClass}
            aria-pressed={selected.has(gameClass) ? 'true' : 'false'}
            data-umami-event="captains-toggle-class"
            data-umami-event-class={gameClass}
          >
            <GameClassIcon gameClass={gameClass} size={20} />
            <span>{gameClass}</span>
          </button>
        ))}
      </form>

      {selected.size > 0 && (
        <form class="captain-volunteer" ws-send data-disable-when-offline>
          <button
            class="captain-toggle"
            name="captainsvolunteer"
            value=""
            aria-pressed={entry?.wantsToCaptain ? 'true' : 'false'}
            disabled={!eligibility.eligible}
            data-umami-event="captains-volunteer"
          >
            {eligibility.eligible ? <IconCrown size={18} /> : <IconLock size={18} />}
            <span>Volunteer as captain</span>
          </button>
          <span class="captain-hint" safe>
            {eligibility.eligible
              ? 'Two volunteers are drawn at random when the queue fills.'
              : eligibility.reason}
          </span>
        </form>
      )}
    </div>
  )
}
