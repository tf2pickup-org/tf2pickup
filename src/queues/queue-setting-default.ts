import { queueConfigurationSchema, type QueueConfiguration } from '../database/models/queue.model'

// The default of a queue setting, or undefined when it has none.
export function queueSettingDefault(field: keyof QueueConfiguration): unknown {
  const result = queueConfigurationSchema.shape[field].safeParse(undefined)
  return result.success ? result.data : undefined
}
