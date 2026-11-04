import { collections } from '../../../../database/collections'
import type { QueueModel } from '../../../../database/models/queue.model'
import type { SteamId64 } from '../../../../shared/types/steam-id-64'
import { QueueSwitcherCount } from './queue-switcher-count'
import { queues } from '../../..'
import { playerCounts } from '../../../player-counts'

// Links to the other enabled queues; the content is swapped in place, and preloaded on hover.
// The dot marks the queue the actor is in.
export async function QueueSwitcher(props: {
  active: Pick<QueueModel, 'slug'>
  actor?: SteamId64 | undefined
}) {
  const enabled = await queues.listEnabled()
  if (enabled.length < 2) {
    return <></>
  }

  const [counts, joined] = await Promise.all([
    Promise.all(enabled.map(playerCounts)),
    props.actor ? collections.queueSlots.distinct('queue', { 'player.steamId': props.actor }) : [],
  ])

  return (
    <nav id="queue-switcher" class="queue-switcher" aria-label="Queues">
      <div class="queue-switcher-options">
        {enabled.map((queue, i) => {
          const { current, required } = counts[i]!
          return (
            <a
              href={queues.queuePageUrl(queue.slug)}
              hx-target="#queue-content"
              hx-swap="outerHTML"
              preload="mouseover"
              aria-current={queue.slug === props.active.slug ? 'page' : undefined}
              data-umami-event="switch-queue"
              data-umami-event-queue={queue.slug}
              class="queue-switcher-option"
              data-joined={joined.some(id => id.equals(queue._id)) ? '' : undefined}
            >
              <span safe>{queue.name}</span>
              <QueueSwitcherCount slug={queue.slug} current={current} required={required} />
            </a>
          )
        })}
      </div>
    </nav>
  )
}
