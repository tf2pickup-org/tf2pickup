import { differenceInMilliseconds } from 'date-fns'
import { collections } from '../database/collections'
import { execute } from './execute'
import { timers, type Tasks } from './tasks'

export async function schedulePending() {
  const pendingTasks = await collections.tasks.find().toArray()
  for (const task of pendingTasks) {
    const name = task.name as keyof Tasks
    const exec = execute(name, task.at, ...(task.params as Parameters<Tasks[keyof Tasks]>))

    const when = differenceInMilliseconds(task.at, Date.now())
    if (when < 0) {
      await exec()
    } else {
      const timeout = setTimeout(async () => {
        await exec()
      }, when)
      timers.set(name, timeout)
    }
  }
}
