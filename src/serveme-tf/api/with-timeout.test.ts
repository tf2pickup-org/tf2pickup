import { describe, it, expect } from 'vitest'
import { withTimeout } from './with-timeout'
import { TimeoutError } from './errors/timeout.error'

describe('when fn does not timeout', () => {
  it('should return fn result', async () => {
    const result = await withTimeout(
      new Promise(resolve => setTimeout(() => resolve('foo'), 50)),
      100,
    )
    expect(result).toEqual('foo')
  })
})

describe('when fn times out', () => {
  it('should throw', async () => {
    const promise = new Promise(resolve => setTimeout(resolve, 100))
    await expect(withTimeout(promise, 50)).rejects.toThrow(TimeoutError)
  })
})
