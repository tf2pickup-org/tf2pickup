import fp from 'fastify-plugin'
import { secondsToMilliseconds } from 'date-fns'
import { collections } from '../../database/collections'
import { logger } from '../../logger'
import { assertIsError } from '../../utils/assert-is-error'
import { tasks, tasksSchema } from '../tasks'
import { errors } from '../../errors'

// eslint-disable-next-line @typescript-eslint/require-await
export default fp(async app => {
  // eslint-disable-next-line @typescript-eslint/require-await
  app.addHook('onReady', async () => {
    setInterval(process, secondsToMilliseconds(1))
  })
})

async function process() {
  const pendingTasks = await collections.tasks.find({ at: { $lte: new Date() } }).toArray()
  await Promise.all(
    pendingTasks.map(async data => {
      // Atomically claim the task by deleting it first - prevents duplicate processing
      const claimed = await collections.tasks.findOneAndDelete({ _id: data._id })
      if (!claimed) {
        return // Task was already claimed by a previous interval
      }

      try {
        logger.debug({ task: claimed }, `executing scheduled task`)
        const task = tasksSchema.parse(claimed)
        const t = tasks[task.name]
        if (!t) {
          throw errors.internalServerError(`task not registered: ${task.name}`)
        }

        // @ts-expect-error ts can't cast task args properly
        await t(task.args)
      } catch (error) {
        assertIsError(error)
        logger.error(error)
      }
    }),
  )
}
