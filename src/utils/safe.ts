import { logger } from '../logger'

export async function safe<T>(fn: () => Promise<T>): Promise<void> {
  try {
    await fn()
  } catch (error) {
    logger.error(error)
  }
}
