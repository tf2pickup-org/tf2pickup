import { secondsToMilliseconds } from 'date-fns'
import { collections } from '../database/collections'
import { logger } from '../logger'
import { assertIsError } from '../utils/assert-is-error'
import { tasks, tasksSchema } from './tasks'

async function process() {
  const pendingTasks = await collections.tasks.find({ at: { $lte: new Date() } }).toArray()
  await Promise.all(
    pendingTasks.map(async data => {
      try {
        logger.debug({ task: data }, `executing scheduled task`)
        const task = tasksSchema.parse(data)
        const t = tasks[task.name]
        if (!t) {
          throw new Error(`task not registered: ${task.name}`)
        }

        // @ts-expect-error
        await t(task.args)
      } catch (error) {
        assertIsError(error)
        logger.error(error)
      } finally {
        await collections.tasks.deleteOne({ _id: data._id })
      }
    }),
  )
}

setInterval(process, secondsToMilliseconds(1))