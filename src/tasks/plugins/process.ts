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

const processingTaskIds = new Set<string>()

async function process() {
  try {
    const pendingTasks = await collections.tasks
      .find({ at: { $lte: new Date() } })
      .toArray()

    const tasksToProcess = pendingTasks.filter(
      task => !processingTaskIds.has(task._id.toString()),
    )

    if (tasksToProcess.length === 0) {
      return
    }

    for (const task of tasksToProcess) {
      processingTaskIds.add(task._id.toString())
    }

    await Promise.all(
      tasksToProcess.map(async data => {
        try {
          logger.debug({ task: data }, `executing scheduled task`)
          const task = tasksSchema.parse(data)
          const t = tasks[task.name]
          if (!t) {
            throw errors.internalServerError(
              `task not registered: ${task.name}`,
            )
          }

          // @ts-expect-error ts can't cast task args properly
          await t(task.args)
        } catch (error) {
          assertIsError(error)
          logger.error(error)
        } finally {
          await collections.tasks.deleteOne({ _id: data._id })
          processingTaskIds.delete(data._id.toString())
        }
      }),
    )
  } catch (error) {
    // Catch errors in the process function itself (e.g. DB connection issues)
    // to prevent the loop from crashing (though setInterval handles throws usually)
    logger.error(error)
  }
}
