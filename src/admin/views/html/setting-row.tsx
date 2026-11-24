import type { Children } from '@kitajs/html'
import { isEqual } from 'es-toolkit'
import { configuration } from '../../../configuration'
import type { Configuration } from '../../../database/models/configuration-entry.model'
import type { QueueConfiguration, QueueModel } from '../../../database/models/queue.model'
import { queueSettingDefault } from '../../../queues/queue-setting-default'

export async function SettingRow(props: {
  label: string
  for?: string
  description?: string
  configKey?: keyof Configuration
  queueSetting?: { queue: QueueModel; field: keyof QueueConfiguration }
  defaultLabel?: string
  children: Children
}) {
  const { resetKey, modified } = await resolveSetting(props)

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
            hx-vals={JSON.stringify({ key: resetKey })}
            hx-confirm={`Reset "${props.label}" to its default? Unsaved changes on this page will be lost.`}
            data-umami-event="reset-setting"
            data-umami-event-key={props.configKey ?? props.queueSetting?.field}
          >
            Reset to default
            {!!props.defaultLabel && <span safe> ({props.defaultLabel})</span>}
          </button>
        )}
      </div>
    </div>
  )
}

async function resolveSetting(props: {
  configKey?: keyof Configuration
  queueSetting?: { queue: QueueModel; field: keyof QueueConfiguration }
}): Promise<{ resetKey?: string; modified: boolean }> {
  if (props.configKey) {
    const value = await configuration.get(props.configKey)
    return {
      resetKey: props.configKey,
      modified: !isEqual(value, configuration.getDefault(props.configKey)),
    }
  }
  if (props.queueSetting) {
    const { queue, field } = props.queueSetting
    const defaultValue = queueSettingDefault(field)
    return {
      resetKey: `queues.${queue.slug}.${field}`,
      modified: defaultValue !== undefined && !isEqual(queue[field], defaultValue),
    }
  }
  return { modified: false }
}
