import { collections } from '../database/collections'
import { execute } from './execute'
import { tasks, type Tasks, timers } from './tasks'

export async function schedule<T extends keyof Tasks>(
  name: T,
  ms: number,
  ...args: Parameters<Tasks[T]>
) {
  if (!tasks[name]) {
    throw new Error(`task not registered: ${name}`)
  }

  const at = new Date(Date.now() + ms)
  await collections.tasks.insertOne({ name, at, params: args })

  const taskWrapped = execute(name, at, ...args)
  const timeout = setTimeout(async () => {
    await taskWrapped()
  }, ms)
  timers.set(name, timeout)
}
