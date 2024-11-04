import { collections } from '../database/collections'
import { timers, type Tasks } from './tasks'

export async function cancelAll<T extends keyof Tasks>(name: T) {
  const t = timers.filter(t => t.name === name)
  t.forEach(t => {
    clearTimeout(t.timer)
    const i = timers.indexOf(t)
    timers.splice(i, 1)
  })
  await collections.tasks.deleteMany({ name })
}
