import { errors } from '../errors'
import { queues } from '../queues'
import { queueConfigurationSchema, type QueueConfiguration } from '../database/models/queue.model'

// queues.<slug>.<field>
export async function parseQueueSettingKey(key: string) {
  const [, slug, field] = /^queues\.([^.]+)\.([^.]+)$/.exec(key) ?? []
  if (!slug || !field || !(field in queueConfigurationSchema.shape)) {
    throw errors.badRequest(`not a queue setting: ${key}`)
  }
  return { queue: await queues.bySlug(slug), field: field as keyof QueueConfiguration }
}
