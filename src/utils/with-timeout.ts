import { TimeoutError } from '../shared/errors/timeout.error'

export const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  let timeout: ReturnType<typeof setTimeout>
  return Promise.race([
    promise,
    new Promise<never>((_resolve, reject) => {
      timeout = setTimeout(() => {
        reject(new TimeoutError(timeoutMs))
      }, timeoutMs)
    }),
  ]).finally(() => clearTimeout(timeout))
}
