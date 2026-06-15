import type { WithId } from 'mongodb'
import { collections } from '../database/collections'
import { errors } from '../errors'
import { logger } from '../logger'
import { assertIsError } from '../utils/assert-is-error'
import { measureTime } from '../utils/measure-time'
import type { TaskModel } from '../database/models/task.model'
import { scheduledTaskTimers } from './scheduled-task-timers'
import { taskExecutionCount, taskExecutionDuration } from './metrics'
import { tasks, tasksSchema } from './tasks'

export function arm(task: WithId<TaskModel>) {
  const key = task._id.toString()
  const delay = Math.max(0, task.at.getTime() - Date.now())

  const timer = setTimeout(() => {
    void run()
  }, delay)
  // the db is the source of truth and tasks re-arm on startup, so a pending
  // timer must not keep the process alive / block shutdown
  timer.unref()
  scheduledTaskTimers.set(key, timer)

  async function run() {
    scheduledTaskTimers.delete(key)

    const claimed = await collections.tasks.findOneAndDelete({ _id: task._id })
    if (!claimed) {
      return
    }

    try {
      await measureTime(
        async () => {
          logger.debug({ task: claimed }, `executing scheduled task`)
          const parsed = tasksSchema.parse(claimed)
          const t = tasks[parsed.name]
          if (!t) {
            throw errors.internalServerError(`task not registered: ${parsed.name}`)
          }

          // @ts-expect-error ts can't cast task args properly
          await t(parsed.args)
        },
        ({ ms, result }) => {
          taskExecutionCount.add(1, { name: task.name, result })
          taskExecutionDuration.record(ms, { name: task.name })
        },
      )
    } catch (error) {
      assertIsError(error)
      logger.error(error)
    }
  }
}
