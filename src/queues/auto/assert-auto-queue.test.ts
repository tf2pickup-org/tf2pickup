import { describe, expect, it } from 'vitest'
import { assertAutoQueue } from './assert-auto-queue'

describe('assertAutoQueue()', () => {
  it('accepts an auto queue', () => {
    expect(() => assertAutoQueue({ launchMode: 'auto' })).not.toThrow()
  })

  it('rejects a captain queue', () => {
    expect(() => assertAutoQueue({ launchMode: 'captain' })).toThrow('not an auto queue')
  })
})
