import type { Children } from '@kitajs/html'
import { isEqual } from 'es-toolkit'
import { configuration } from '../../../configuration'
import type { Configuration } from '../../../database/models/configuration-entry.model'

export async function SettingRow(props: {
  label: string
  for?: string
  description?: string
  configKey?: keyof Configuration
  defaultLabel?: string
  children: Children
}) {
  const modified =
    props.configKey !== undefined &&
    !isEqual(await configuration.get(props.configKey), configuration.getDefault(props.configKey))

  return (
    <div class="setting-row">
      <div class="setting-row-label">
        <div class="flex flex-row items-center gap-2">
          {props.for ? (
            <label for={props.for} safe>
              {props.label}
            </label>
          ) : (
            <span safe>{props.label}</span>
          )}
          {modified && <span class="setting-modified">Modified</span>}
        </div>
        {!!props.description && (
          <p class="setting-row-description" safe>
            {props.description}
          </p>
        )}
      </div>
      <div class="setting-row-control">
        {props.children}
        {modified && (
          <button
            type="button"
            class="setting-reset"
            hx-post="/admin/reset-setting"
            hx-vals={JSON.stringify({ key: props.configKey })}
            hx-confirm={`Reset "${props.label}" to its default? Unsaved changes on this page will be lost.`}
            data-umami-event="reset-setting"
            data-umami-event-key={props.configKey}
          >
            Reset to default
            {!!props.defaultLabel && <span safe> ({props.defaultLabel})</span>}
          </button>
        )}
      </div>
    </div>
  )
}
