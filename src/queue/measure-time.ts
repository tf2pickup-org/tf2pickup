import { performance } from 'node:perf_hooks'

interface MeasureTimeRecordProps {
  ms: number
  result: 'success' | 'error'
}

export async function measureTime<T>(
  fn: () => Promise<T>,
  record: (props: MeasureTimeRecordProps) => void,
): Promise<T> {
  const start = performance.now()
  return fn()
    .then(ret => {
      record({ ms: performance.now() - start, result: 'success' })
      return ret
    })
    .catch((error: unknown) => {
      record({ ms: performance.now() - start, result: 'error' })
      throw error
    })
}
