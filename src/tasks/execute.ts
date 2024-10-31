import { collections } from '../database/collections'
import { logger } from '../logger'
import { assertIsError } from '../utils/assert-is-error'
import { tasks, type Tasks } from './tasks'

export function execute<T extends keyof Tasks>(name: T, at: Date, ...args: Parameters<Tasks[T]>) {
  return async () => {
    logger.debug({ task: { name, args } }, `executing scheduled task`)
    if (!tasks[name]) {
      throw new Error(`task not registered: ${name}`)
    }
    try {
      // https://github.com/microsoft/TypeScript/issues/57322
      // task(...args)
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      // eslint-disable-next-line prefer-spread
      await tasks[name]!.apply(null, args)
      await collections.tasks.deleteOne({ name, at })
    } catch (error) {
      assertIsError(error)
      logger.error(error)
    }
  }
}
