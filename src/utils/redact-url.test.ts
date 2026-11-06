import { describe, expect, it } from 'vitest'
import { redactUrl } from './redact-url'

describe('redactUrl', () => {
  it('redacts the secret query param', () => {
    expect(redactUrl('/auth/test?steamId=76561199998000002&secret=hunter2')).toBe(
      '/auth/test?steamId=76561199998000002&secret=REDACTED',
    )
  })

  it('leaves other urls alone', () => {
    expect(redactUrl('/players/123?gamespage=1')).toBe('/players/123?gamespage=1')
    expect(redactUrl('/games')).toBe('/games')
  })
})
