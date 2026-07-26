import { flattenObject } from 'es-toolkit'
import { collections } from '../database/collections'
import { errors } from '../errors'
import { scheduledTaskTimers } from './scheduled-task-timers'
import { tasks, type TaskArgs, type Tasks } from './tasks'

export async function cancel<T extends keyof Tasks>(name: T, ...args: Partial<TaskArgs[T]>[]) {
  if (!tasks[name]) {
    throw errors.internalServerError(`task not registered: ${name}`)
  }

  const a = args[0] ? flattenObject({ args: args[0] }) : {}
  const matching = await collections.tasks
    .find({ name, ...a }, { projection: { _id: 1 } })
    .toArray()
  for (const { _id } of matching) {
    const key = _id.toString()
    const timer = scheduledTaskTimers.get(key)
    if (timer) {
      clearTimeout(timer)
    }
    scheduledTaskTimers.delete(key)
  }
  await collections.tasks.deleteMany({ name, ...a })
}
