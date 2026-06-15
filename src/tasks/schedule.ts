import { collections } from '../database/collections'
import { errors } from '../errors'
import { arm } from './arm'
import { tasks, type TaskArgs, type Tasks } from './tasks'

export async function schedule<T extends keyof Tasks>(name: T, ms: number, ...args: TaskArgs[T][]) {
  if (!tasks[name]) {
    throw errors.internalServerError(`task not registered: ${name}`)
  }

  const at = new Date(Date.now() + ms)
  const taskArgs = args[0] ?? {}
  const { insertedId } = await collections.tasks.insertOne({ name, at, args: taskArgs })
  arm({ _id: insertedId, name, at, args: taskArgs })
}
