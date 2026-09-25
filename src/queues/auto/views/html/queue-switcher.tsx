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
    <nav class="flex flex-row flex-wrap gap-2" aria-label="Queues">
      {enabled.map((queue, i) => {
        const { current, required } = counts[i]!
        const active = queue.slug === props.active.slug
        return (
          <a
            href={queues.queuePageUrl(queue.slug)}
            hx-target="#queue-content"
            hx-swap="outerHTML"
            preload="mouseover"
            aria-current={active ? 'page' : undefined}
            data-umami-event="switch-queue"
            data-umami-event-queue={queue.slug}
            class={[
              'flex flex-row items-center gap-2 rounded-md px-3 py-1.5 text-sm font-bold',
              active
                ? 'bg-accent text-white'
                : 'bg-abru-light-10 text-abru-light-75 hover:text-white',
            ]}
          >
            <span safe>{queue.name}</span>
            <QueueSwitcherCount slug={queue.slug} current={current} required={required} />
          </a>
        )
      })}
    </nav>
  )
}
