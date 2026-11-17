import { describe, expect, it } from 'vitest'
import { queuePageUrl } from './queue-page-url'

describe('queuePageUrl', () => {
  it('parses back the slug it was built from', () => {
    expect(queuePageUrl.parse(queuePageUrl('auto-6v6'))).toBe('auto-6v6')
  })

  it.each(['/', '/games/1', '/q/', '/q/6v6/players', '/q/6v6?x=1', undefined])(
    'does not parse %s',
    url => {
      expect(queuePageUrl.parse(url)).toBeUndefined()
    },
  )
})
