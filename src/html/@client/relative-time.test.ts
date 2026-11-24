import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { minutesToMilliseconds, secondsToMilliseconds } from 'date-fns'

const htmx = vi.hoisted(() => ({ defineExtension: vi.fn() }))
vi.mock('./htmx', () => ({ default: htmx }))

type Handler = (name: string, event: { detail: { elt: unknown } }) => void
let onEvent: Handler
const internalData = new WeakMap<object, Record<string, unknown>>()

beforeAll(async () => {
  await import('./relative-time')
  const extension = htmx.defineExtension.mock.calls[0]![1] as {
    init: (api: unknown) => void
    onEvent: Handler
  }
  extension.init({
    getInternalData: (elt: object) => {
      if (!internalData.has(elt)) internalData.set(elt, {})
      return internalData.get(elt)
    },
  })
  onEvent = extension.onEvent
})
beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

function element(date: Date) {
  return {
    textContent: 'in 26 minutes',
    hasAttribute: () => true,
    getAttribute: () => date.toISOString(),
    querySelectorAll: () => [],
  }
}

describe('relative-time', () => {
  it('refreshes the text as time passes', () => {
    const node = element(new Date(Date.now() + minutesToMilliseconds(26)))
    onEvent('htmx:afterProcessNode', { detail: { elt: node } })
    vi.advanceTimersByTime(minutesToMilliseconds(5) + secondsToMilliseconds(1))
    expect(node.textContent).toBe('in 21 minutes')
  })

  it('stops refreshing after cleanup', () => {
    const node = element(new Date(Date.now() + minutesToMilliseconds(26)))
    onEvent('htmx:afterProcessNode', { detail: { elt: node } })
    onEvent('htmx:beforeCleanupElement', { detail: { elt: node } })
    vi.advanceTimersByTime(minutesToMilliseconds(5))
    expect(node.textContent).toBe('in 26 minutes')
  })
})
