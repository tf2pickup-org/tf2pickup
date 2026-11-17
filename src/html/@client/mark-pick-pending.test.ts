import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { secondsToMilliseconds } from 'date-fns'
import { markPickPending } from './mark-pick-pending'

function fakeButton() {
  const classes = new Set<string>()
  const attributes = new Map<string, string>()
  return {
    dataset: {} as Record<string, string | undefined>,
    isConnected: true,
    disabled: false,
    classList: {
      add: (...names: string[]) => names.forEach(name => classes.add(name)),
      remove: (...names: string[]) => names.forEach(name => classes.delete(name)),
      has: (name: string) => classes.has(name),
    },
    setAttribute: (name: string, value: string) => attributes.set(name, value),
    removeAttribute: (name: string) => attributes.delete(name),
    getAttribute: (name: string) => attributes.get(name),
  }
}

beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
})

describe('markPickPending()', () => {
  it('dims the row and ignores clicks at once, then restores it if the pick was refused', () => {
    const button = fakeButton()
    markPickPending(button as unknown as HTMLElement)
    expect('pending' in button.dataset).toBe(true)
    expect(button.classList.has('opacity-60')).toBe(true)
    expect(button.getAttribute('aria-disabled')).toBe('true')

    vi.advanceTimersByTime(secondsToMilliseconds(3))
    expect('pending' in button.dataset).toBe(false)
    expect(button.classList.has('opacity-60')).toBe(false)
    expect(button.getAttribute('aria-disabled')).toBeUndefined()
  })

  it('never touches disabled, which the offline handling owns', () => {
    const button = fakeButton()
    markPickPending(button as unknown as HTMLElement)
    button.disabled = true // the socket closed while the pick was pending
    vi.advanceTimersByTime(secondsToMilliseconds(5))
    expect(button.disabled).toBe(true)
  })

  it('leaves a row the draft already replaced alone', () => {
    const button = fakeButton()
    markPickPending(button as unknown as HTMLElement)
    button.isConnected = false
    vi.advanceTimersByTime(secondsToMilliseconds(5))
    expect(button.classList.has('opacity-60')).toBe(true)
  })
})
