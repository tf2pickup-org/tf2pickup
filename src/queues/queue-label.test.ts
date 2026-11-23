import { describe, expect, it } from 'vitest'
import { queueLabel } from './queue-label'

describe('queueLabel()', () => {
  it('marks restricted and captain queues', () => {
    expect(queueLabel({ name: '6v6', requireVerification: false, launchMode: 'auto' })).toBe('6v6')
    expect(queueLabel({ name: '6v6', requireVerification: true, launchMode: 'auto' })).toBe(
      '🔒 6v6',
    )
    expect(queueLabel({ name: '9v9', requireVerification: true, launchMode: 'captain' })).toBe(
      '🔒 👑 9v9',
    )
  })
})
