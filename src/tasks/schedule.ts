import { collections } from '../database/collections'
import { tasks, type TaskArgs, type Tasks } from './tasks'

export async function schedule<T extends keyof Tasks>(name: T, ms: number, ...args: TaskArgs[T][]) {
  if (!tasks[name]) {
    throw new Error(`task not registered: ${name}`)
  }

  const at = new Date(Date.now() + ms)
  await collections.tasks.insertOne({ name, at, args: args[0] ?? {} })
}
