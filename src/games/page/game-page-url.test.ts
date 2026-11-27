import { describe, expect, it } from 'vitest'
import type { GameNumber } from '../../database/models/game.model'
import { gamePageUrl } from './game-page-url'

describe('gamePageUrl', () => {
  it('parses back the number it was built from', () => {
    expect(gamePageUrl.parse(gamePageUrl(42 as GameNumber))).toBe(42)
  })

  it.each(['/', '/q/6v6', '/games', '/games/', '/games/abc', '/games/1/og-image.png', undefined])(
    'does not parse %s',
    url => {
      expect(gamePageUrl.parse(url)).toBeUndefined()
    },
  )
})
