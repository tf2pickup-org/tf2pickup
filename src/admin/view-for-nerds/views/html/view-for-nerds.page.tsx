import { configuration } from '../../../../configuration'
import { configurationSchema } from '../../../../database/models/configuration-entry.model'
import { IconArrowBackUp } from '../../../../html/components/icons'
import { Admin } from '../../../views/html/admin'
import {
  queueConfigurationSchema,
  type QueueConfiguration,
} from '../../../../database/models/queue.model'
import { queues } from '../../../../queues'
import { queueSettingDefault } from '../../../../queues/queue-setting-default'

export async function ViewForNerdsPage() {
  const entries = await Promise.all(
    configurationSchema._zod.def.options.map(async option => {
      const _key = option._zod.def.shape.key._zod.def.values[0]!
      const defaultValue = option._zod.def.shape.value._zod.def.defaultValue
      const value = await configuration.get(_key)
      return { _key, value, defaultValue }
    }),
  )
  const queueEntries = (await queues.list()).flatMap(queue =>
    (Object.keys(queueConfigurationSchema.shape) as (keyof QueueConfiguration)[]).map(field => {
      const defaultValue = queueSettingDefault(field)
      return {
        _key: `queues.${queue.slug}.${field}`,
        value: queue[field],
        // a setting without a default can't be reset
        defaultValue: defaultValue === undefined ? queue[field] : defaultValue,
        url: '/admin/view-for-nerds/queues',
      }
    }),
  )

  return (
    <Admin activePage="view-for-nerds">
      <div class="admin-panel-set">
        <div class="table w-full max-lg:block">
          <div class="table-header-group max-lg:hidden">
            <div class="table-row">
              <div class="table-cell">Key</div>
              <div class="table-cell">Value</div>
            </div>
          </div>

          <div class="table-row-group max-lg:block max-lg:space-y-4">
            {[...entries, ...queueEntries].map(props => (
              <ConfigurationEntryEdit {...props} />
            ))}
          </div>
        </div>
      </div>
    </Admin>
  )
}

export function ConfigurationEntryEdit(props: {
  _key: string
  value: unknown
  defaultValue: unknown
  url?: string
}) {
  const url = props.url ?? '/admin/view-for-nerds'
  const valueJson = JSON.stringify(props.value)
  const isDefault = valueJson === JSON.stringify(props.defaultValue)

  let resetButton = <></>
  if (!isDefault) {
    resetButton = (
      <button
        class="text-abru-light-60 align-middle"
        type="button"
        hx-delete={url}
        hx-trigger="click"
        hx-target="closest form"
        hx-swap="outerHTML"
        hx-params="not value"
      >
        <span class="sr-only">Reset default</span>
        <IconArrowBackUp></IconArrowBackUp>
      </button>
    )
  }

  return (
    <form
      class="hover:bg-abru-dark-15 table-row max-lg:grid max-lg:grid-cols-[1fr_auto] max-lg:items-center max-lg:gap-x-2"
      hx-post={url}
      hx-swap="outerHTML"
    >
      <input type="hidden" name="key" value={props._key} />
      <div class="text-abru-light-75 table-cell max-lg:col-span-2 max-lg:[overflow-wrap:anywhere]">
        <label for={`${props._key}-edit`} class={[isDefault && 'font-normal']} safe>
          {props._key}
        </label>
      </div>
      <div class="table-cell">
        <input
          type="text"
          name="value"
          value={valueJson}
          class="w-full"
          id={`${props._key}-edit`}
        />
      </div>
      <div class="table-cell align-middle">{resetButton}</div>
    </form>
  )
}
