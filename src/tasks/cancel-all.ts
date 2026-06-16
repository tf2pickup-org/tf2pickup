import { collections } from '../database/collections'
import { scheduledTaskTimers } from './scheduled-task-timers'
import { type Tasks } from './tasks'

export async function cancelAll(name: keyof Tasks) {
  const matching = await collections.tasks.find({ name }, { projection: { _id: 1 } }).toArray()
  for (const { _id } of matching) {
    const key = _id.toString()
    const timer = scheduledTaskTimers.get(key)
    if (timer) {
      clearTimeout(timer)
    }
    scheduledTaskTimers.delete(key)
  }
  await collections.tasks.deleteMany({ name })
}
