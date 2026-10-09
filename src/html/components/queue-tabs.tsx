import type { QueueModel } from '../../database/models/queue.model'

// Links to the same page for each queue.
export function QueueTabs(props: {
  queues: Pick<QueueModel, 'slug' | 'name' | 'enabled'>[]
  active: string
  href: (slug: string) => string
}) {
  return (
    <nav class="admin-tabs" aria-label="Queues">
      {props.queues.map(({ slug, name, enabled }) => (
        <a
          href={props.href(slug)}
          class={[!enabled && 'italic']}
          aria-current={slug === props.active ? 'page' : undefined}
          safe
        >
          {name}
        </a>
      ))}
    </nav>
  )
}
