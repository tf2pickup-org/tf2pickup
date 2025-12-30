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
    const intervalMs = secondsToMilliseconds(1)

    let isProcessing = false
    let rerunRequested = false

    const runOnce = async () => {
      if (isProcessing) {
        rerunRequested = true
        return
      }

      isProcessing = true
      try {
        await process()
      } catch (error) {
        assertIsError(error)
        logger.error(error)
      } finally {
        isProcessing = false
        if (rerunRequested) {
          rerunRequested = false
          void runOnce()
        }
      }
    }

    const timer = setInterval(() => {
      void runOnce()
    }, intervalMs)

    app.addHook('onClose', () => {
      clearInterval(timer)
    })
  })
})

async function process() {
  try {
    const pendingTasks = await collections.tasks.find({ at: { $lte: new Date() } }).toArray()
    await Promise.all(
      pendingTasks.map(async data => {
        try {
          logger.debug({ task: data }, `executing scheduled task`)
          const task = tasksSchema.parse(data)
          const t = tasks[task.name]
          if (!t) {
            throw errors.internalServerError(`task not registered: ${task.name}`)
          }

          // @ts-expect-error ts can't cast task args properly
          await t(task.args)
        } catch (error) {
          assertIsError(error)
          logger.error(error)
        } finally {
          await collections.tasks.deleteOne({ _id: data._id })
        }
      }),
    )
  } catch (error) {
    assertIsError(error)
    logger.error(error)
  }
}
