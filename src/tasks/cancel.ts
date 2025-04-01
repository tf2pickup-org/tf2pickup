import { flattenObject } from 'es-toolkit'
import { collections } from '../database/collections'
import { errors } from '../errors'
import { tasks, type TaskArgs, type Tasks } from './tasks'

export async function cancel<T extends keyof Tasks>(name: T, ...args: Partial<TaskArgs[T]>[]) {
  if (!tasks[name]) {
    throw errors.internalServerError(`task not registered: ${name}`)
  }

  const a = args[0] ? flattenObject({ args: args[0] }) : {}
  await collections.tasks.deleteMany({ name, ...a })
}
