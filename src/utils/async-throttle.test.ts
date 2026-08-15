import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { secondsToMilliseconds } from 'date-fns'
import { asyncThrottle } from './async-throttle'

describe('asyncThrottle', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('invokes the wrapped function only once for calls within the window', async () => {
    const fn = vi.fn(async () => 'result')
    const throttled = asyncThrottle(fn, secondsToMilliseconds(30))

    const first = throttled()
    const second = throttled()

    expect(fn).toHaveBeenCalledTimes(1)
    expect(first).toBe(second)
    expect(await first).toBe('result')
    expect(await second).toBe('result')
  })

  it('re-invokes the wrapped function after the window elapses', async () => {
    const fn = vi.fn(async () => 'result')
    const throttled = asyncThrottle(fn, secondsToMilliseconds(30))

    await throttled()
    expect(fn).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(secondsToMilliseconds(30))

    await throttled()
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('keeps throttling until the window has fully elapsed', async () => {
    const fn = vi.fn(async () => 'result')
    const throttled = asyncThrottle(fn, secondsToMilliseconds(30))

    await throttled()
    vi.advanceTimersByTime(secondsToMilliseconds(30) - 1)

    await throttled()
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('ignores the arguments of calls that hit the cached result', async () => {
    const fn = vi.fn(async (value: number) => value)
    const throttled = asyncThrottle(fn, secondsToMilliseconds(30))

    expect(await throttled(1)).toBe(1)
    expect(await throttled(2)).toBe(1)

    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith(1)
  })
})
