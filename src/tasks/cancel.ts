import { collections } from '../database/collections'
import { tasks, type Tasks } from './tasks'

export async function cancel<T extends keyof Tasks>(name: T, ...args: Parameters<Tasks[T]>) {
  if (!tasks[name]) {
    throw new Error(`task not registered: ${name}`)
  }

  await collections.tasks.deleteOne({ name, params: args })
}
