import { describe, expect, it } from 'vitest'
import { assertQueueOpen } from './assert-queue-open'
import { QueueState } from '../database/models/queue-state.model'

describe('assertQueueOpen()', () => {
  it.each([QueueState.waiting, QueueState.ready])(
    'allows membership changes while %s',
    (state: QueueState) => {
      expect(() => assertQueueOpen(state)).not.toThrow()
    },
  )

  // Regression: leave/removeOfferedClass used to only reject `launching`, so a
  // drafted player could walk out mid-draft and still be handed a game slot.
  it.each([QueueState.draft, QueueState.launching])(
    'rejects membership changes while %s',
    (state: QueueState) => {
      expect(() => assertQueueOpen(state)).toThrow('invalid queue state')
    },
  )
})
