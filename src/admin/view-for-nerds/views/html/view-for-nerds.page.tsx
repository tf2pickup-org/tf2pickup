import type { User } from '../../../../auth/types/user'
import { configuration } from '../../../../configuration'
import {
  configurationSchema,
  type Configuration,
} from '../../../../database/models/configuration-entry.model'
import { IconArrowBackUp } from '../../../../html/components/icons'
import { Admin } from '../../../views/html/admin'

export async function ViewForNerdsPage(props: { user: User }) {
  const entries = await Promise.all(
    configurationSchema._zod.def.options.map(async option => {
      const _key = option._zod.def.shape.key._zod.def.values[0]!
      const defaultValue = option._zod.def.shape.value._zod.def.defaultValue
      const value = await configuration.get(_key)
      return { _key, value, defaultValue }
    }),
  )

  return (
    <Admin activePage="view-for-nerds" user={props.user}>
      <div class="admin-panel-set">
        <div class="table w-full">
          <div class="table-header-group">
            <div class="table-row">
              <div class="table-cell">Key</div>
              <div class="table-cell">Value</div>
            </div>
          </div>

          <div class="table-row-group">
            {entries.map(props => (
              <ConfigurationEntryEdit {...props} />
            ))}
          </div>
        </div>
      </div>
    </Admin>
  )
}

export function ConfigurationEntryEdit(props: {
  _key: keyof Configuration
  value: unknown
  defaultValue: unknown
}) {
  const valueJson = JSON.stringify(props.value)
  const isDefault = valueJson === JSON.stringify(props.defaultValue)

  let resetButton = <></>
  if (!isDefault) {
    resetButton = (
      <button
        class="align-middle text-abru-light-60"
        type="button"
        hx-delete="/admin/view-for-nerds"
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
      class="table-row hover:bg-abru-dark-15"
      hx-post="/admin/view-for-nerds"
      hx-swap="outerHTML"
    >
      <input type="hidden" name="key" value={props._key} />
      <div class="table-cell text-abru-light-75">
        <label for={`${props._key}-edit`} class={[isDefault && 'font-normal']}>
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
