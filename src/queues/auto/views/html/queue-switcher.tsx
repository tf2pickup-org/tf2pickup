import type { QueueModel } from '../../../../database/models/queue.model'
import { QueueSwitcherCount } from './queue-switcher-count'
import { queues } from '../../..'
import { playerCounts } from '../../../player-counts'

// Links to the other enabled queues; the content is swapped in place, and preloaded on hover.
export async function QueueSwitcher(props: { active: Pick<QueueModel, 'slug'> }) {
  const enabled = await queues.listEnabled()
  if (enabled.length < 2) {
    return <></>
  }

  const counts = await Promise.all(enabled.map(playerCounts))

  return (
    <nav class="queue-switcher" aria-label="Queues">
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
