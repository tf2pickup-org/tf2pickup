import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { secondsToMilliseconds } from 'date-fns'

const htmx = vi.hoisted(() => ({
  defineExtension: vi.fn(),
  parseInterval: vi.fn(() => secondsToMilliseconds(1)),
}))
vi.mock('./htmx', () => ({ default: htmx }))

let onEvent: (name: string, event: { detail: { elt: unknown } }) => void

beforeAll(async () => {
  await import('./remove-me')
  onEvent = (htmx.defineExtension.mock.calls[0]![1] as { onEvent: typeof onEvent }).onEvent
})
beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

function element(timing: string | null = '1s') {
  const node = {
    getAttribute: vi.fn(() => timing),
    querySelectorAll: () => [],
    parentElement: { removeChild: vi.fn() } as { removeChild: () => void } | null,
    remove: vi.fn(),
  }
  return node
}

describe('remove-me', () => {
  it('safely expires a node already detached by a swap', () => {
    const node = element()
    onEvent('htmx:afterProcessNode', { detail: { elt: node } })
    node.parentElement = null
    expect(() => vi.runAllTimers()).not.toThrow()
  })

  it('schedules a node only once when both it and its parent are processed', () => {
    const node = element()
    const parent = { ...element(null), querySelectorAll: () => [node] }
    onEvent('htmx:afterProcessNode', { detail: { elt: parent } })
    onEvent('htmx:afterProcessNode', { detail: { elt: node } })
    expect(vi.getTimerCount()).toBe(1)
    vi.runAllTimers()
    expect(node.remove).toHaveBeenCalledOnce()
  })

  it('cancels removal when htmx cleans up the node', () => {
    const node = element()
    onEvent('htmx:afterProcessNode', { detail: { elt: node } })
    onEvent('htmx:beforeCleanupElement', { detail: { elt: node } })
    expect(vi.getTimerCount()).toBe(0)
    vi.runAllTimers()
    expect(node.remove).not.toHaveBeenCalled()
  })
})
