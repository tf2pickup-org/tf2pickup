import type { QueueModel } from '../../../../database/models/queue.model'
import { QueueTabs } from '../../../../html/components/queue-tabs'
import { queues } from '../../../../queues'
import { Admin } from '../../../views/html/admin'
import { MapVoteOptions } from './map-vote-options'

export async function ScrambleMaps(props: { queue: QueueModel }) {
  return (
    <Admin activePage="scramble-maps">
      <QueueTabs
        queues={await queues.listEnabled()}
        active={props.queue.slug}
        href={slug => `/admin/scramble-maps?queue=${slug}`}
      />
      <div class="admin-panel-set">
        <MapVoteOptions queue={props.queue._id} />

        <div class="mt-6 flex w-full items-center justify-center">
          <button
            class="button"
            data-variant="accent"
            data-size="dense"
            data-umami-event="scramble-maps"
            hx-put={`/admin/scramble-maps/scramble?queue=${props.queue.slug}`}
            hx-target="#adminPanelMapVoteOptions"
            hx-swap="outerHTML"
          >
            <span>Scramble</span>
          </button>
        </div>
      </div>
    </Admin>
  )
}
