import { collections } from '../database/collections'
import { timers, type Tasks } from './tasks'

export async function cancelAll<T extends keyof Tasks>(name: T) {
  const timer = timers.get(name)
  if (timer?.hasRef()) {
    clearTimeout(timer)
  }
  await collections.tasks.deleteMany({ name })
}
