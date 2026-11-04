import { queues } from '../../../../queues'
import { IconMinus, IconPlus } from '../../../../html/components/icons'
import type { QueueModel } from '../../../../database/models/queue.model'
import { QueueTabs } from '../../../../html/components/queue-tabs'
import { Admin } from '../../../views/html/admin'
import { SaveButton } from '../../../views/html/save-button'

export async function MapPoolPage(props: { queue: QueueModel }) {
  const { maps } = props.queue

  return (
    <Admin activePage="map-pool">
      <QueueTabs
        queues={await queues.list()}
        active={props.queue.slug}
        href={slug => `/admin/map-pool?queue=${slug}`}
      />
      <form action={`/admin/map-pool?queue=${props.queue.slug}`} method="post">
        <div class="admin-panel-set">
          <table class="table-auto max-lg:w-full">
            <thead>
              <tr>
                <th>Map name</th>
                <th>Config</th>
              </tr>
            </thead>

            <tbody id="mapPoolList">
              {maps.map(props => (
                <MapPoolEntry {...props} />
              ))}
            </tbody>
          </table>

          <button
            class="mt-2 flex flex-row items-center gap-2 text-white hover:underline"
            data-umami-event="add-map-pool-entry"
            hx-post="/admin/map-pool/create"
            hx-trigger="click"
            hx-target="#mapPoolList"
            hx-swap="beforeend"
          >
            <IconPlus />
            Add map
          </button>

          <p>
            <SaveButton />
          </p>
        </div>
      </form>
    </Admin>
  )
}

export function MapPoolEntry(props: { name: string; execConfig?: string | undefined }) {
  return (
    <tr>
      <td>
        <input
          type="text"
          name="name[]"
          aria-label="Map name"
          value={props.name}
          required
          class="max-lg:w-full max-lg:min-w-0"
        />
      </td>
      <td>
        <input
          type="text"
          name="execConfig[]"
          aria-label="Map config"
          value={props.execConfig}
          class="max-lg:w-full max-lg:min-w-0"
        />
      </td>
      <td>
        <button class="text-white" data-remove-closest="tr" aria-label="Remove map">
          <IconMinus />
        </button>
      </td>
    </tr>
  )
}
