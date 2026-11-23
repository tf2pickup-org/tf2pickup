import type { QueueModel } from '../../../database/models/queue.model'
import type { SteamId64 } from '../../../shared/types/steam-id-64'
import { QueueSwitcherCount } from './queue-switcher-count'
import { queues } from '../..'
import { membership } from '../../membership'
import { playerCounts } from '../../player-counts'

// Links to the other enabled queues; the content is swapped in place, and preloaded on hover.
// The dot marks the queue the actor is in.
export async function QueueSwitcher(props: {
  active: Pick<QueueModel, 'slug'>
  actor?: SteamId64 | undefined
}) {
  const enabled = await queues.listEnabled()
  if (!isShown(enabled)) {
    return <></>
  }

  const [counts, joined] = await Promise.all([
    Promise.all(enabled.map(playerCounts)),
    props.actor ? membership(props.actor) : null,
  ])

  // the indicator comes first, so a view transition always keeps it under the labels
  const activeIndex = enabled.findIndex(queue => queue.slug === props.active.slug)

  return (
    <nav id="queue-switcher" class="queue-switcher" aria-label="Queues" data-reveal-current>
      <div class="queue-switcher-options">
        {activeIndex >= 0 && (
          <span class="queue-switcher-indicator" style={`grid-column: ${activeIndex + 1}`} />
        )}
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
              style={`grid-column: ${i + 1}`}
              data-joined={joined?.queue.equals(queue._id) ? '' : undefined}
            >
              <span
                class="queue-switcher-label"
                style={`view-transition-name: queue-switcher-label-${queue.slug}`}
              >
                <span safe>{queues.queueLabel(queue)}</span>
                <QueueSwitcherCount slug={queue.slug} current={current} required={required} />
              </span>
            </a>
          )
        })}
      </div>
    </nav>
  )
}

QueueSwitcher.count = async (props: { queue: QueueModel }) => {
  if (!isShown(await queues.listEnabled())) {
    return <></>
  }

  const { current, required } = await playerCounts(props.queue)
  return <QueueSwitcherCount slug={props.queue.slug} current={current} required={required} />
}

function isShown(enabled: QueueModel[]) {
  return enabled.length >= 2
}
