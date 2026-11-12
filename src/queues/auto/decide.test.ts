import { describe, expect, it } from 'vitest'
import { QueueState } from '../../database/models/queue-state.model'
import { decide } from './decide'

describe('decide()', () => {
  it.each([
    [QueueState.waiting, { players: 11, ready: 0, slots: 12 }, null],
    [QueueState.waiting, { players: 12, ready: 0, slots: 12 }, QueueState.ready],
    [QueueState.ready, { players: 12, ready: 11, slots: 12 }, null],
    [QueueState.ready, { players: 11, ready: 11, slots: 12 }, null],
    [QueueState.ready, { players: 12, ready: 12, slots: 12 }, QueueState.launching],
    [QueueState.ready, { players: 0, ready: 0, slots: 12 }, QueueState.waiting],
    [QueueState.launching, { players: 12, ready: 12, slots: 12 }, null],
    [QueueState.launching, { players: 0, ready: 0, slots: 12 }, null],
  ])('%s with %o → %s', (state, counts, expected) => {
    expect(decide(state, counts)).toBe(expected)
  })
})
