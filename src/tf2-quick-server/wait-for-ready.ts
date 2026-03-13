import { secondsToMilliseconds } from 'date-fns'
import { logger } from '../logger'
import { type Tf2QuickServer, getTask } from './client'
import { delay } from 'es-toolkit'
import { errors } from '../errors'
import { configuration } from '../configuration'

const pollInterval = secondsToMilliseconds(10)

export async function waitForReady(taskId: string, signal?: AbortSignal): Promise<Tf2QuickServer> {
  const timeout = await configuration.get('tf2_quick_server.timeout')
  const deadline = Date.now() + timeout

  while (Date.now() < deadline) {
    if (signal?.aborted) {
      throw new Error(`${signal.reason}`)
    }

    await delay(pollInterval)

    if (signal?.aborted) {
      throw new Error(`${signal.reason}`)
    }

    const task = await getTask(taskId)
    logger.debug({ taskId, status: task.status }, 'polling TF2 QuickServer task')

    if (task.status === 'completed' && task.result) {
      return task.result
    }

    if (task.status === 'failed') {
      throw errors.internalServerError(
        `TF2 QuickServer creation failed: ${task.error ?? 'unknown error'}`,
      )
    }
  }

  throw errors.internalServerError('timed out waiting for TF2 QuickServer to be ready')
}
