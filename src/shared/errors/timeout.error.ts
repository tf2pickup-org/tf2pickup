export class TimeoutError extends Error {
  constructor(public readonly timeoutMs: number) {
    super(`timed out after ${timeoutMs}ms`)
  }
}
