import { describe, expect, it } from 'vitest'
import { QueueState } from '../../../database/models/queue-state.model'
import { decideCaptain } from './decide-captain'

describe('decideCaptain()', () => {
  it.each([
    [QueueState.waiting, true, QueueState.ready],
    [QueueState.waiting, false, null],
    [QueueState.ready, true, null],
    [QueueState.ready, false, QueueState.waiting],
    [QueueState.drafting, true, null],
    [QueueState.drafting, false, null],
    [QueueState.banningMaps, true, null],
    [QueueState.launching, true, null],
  ])('%s, full=%s → %s', (state, full, expected) => {
    expect(decideCaptain(state, { full })).toBe(expected)
  })
  it('starts a draft only while ready, full and everyone ready', () => {
    expect(decideCaptain(QueueState.ready, { full: true, allReady: true })).toBe(
      QueueState.drafting,
    )
    expect(decideCaptain(QueueState.ready, { full: false, allReady: true })).toBe(
      QueueState.waiting,
    )
    expect(decideCaptain(QueueState.waiting, { full: true, allReady: true })).toBe(QueueState.ready)
  })
})
