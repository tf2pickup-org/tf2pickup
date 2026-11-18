import { describe, expect, it } from 'vitest'
import { suppressedWhileFocused } from './suppressed-while-focused'

describe('suppressedWhileFocused()', () => {
  it.each([
    [true, true, true],
    [true, false, false],
    [false, true, false],
    [false, false, false],
  ])('flagged=%s focused=%s → %s', (flagged, hasFocus, expected) => {
    expect(suppressedWhileFocused(flagged, hasFocus)).toBe(expected)
  })
})
