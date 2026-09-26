import type { QueueModel } from '../../database/models/queue.model'

// Links to the same page for each queue.
export function QueueTabs(props: {
  queues: Pick<QueueModel, 'slug' | 'name' | 'enabled'>[]
  active: string
  href: (slug: string) => string
}) {
  return (
    <nav class="flex flex-row flex-wrap gap-2" aria-label="Queues">
      {props.queues.map(({ slug, name, enabled }) => (
        <a
          href={props.href(slug)}
          class={[
            'rounded-md px-3 py-1.5 text-sm font-bold whitespace-nowrap',
            slug === props.active
              ? 'bg-crimson-600 text-white'
              : 'bg-zinc-800 text-zinc-200 hover:text-white',
            !enabled && 'italic',
          ]}
          aria-current={slug === props.active ? 'page' : undefined}
          safe
        >
          {name}
        </a>
      ))}
    </nav>
  )
}
