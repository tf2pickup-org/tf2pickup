import { describe, expect, it, vi } from 'vitest'
import { urlGamemode } from './url-gamemode'

vi.mock('./enabled-gamemodes', () => ({
  enabledGamemodes: ['6v6', '9v9'],
  defaultGamemode: '6v6',
}))

describe('urlGamemode', () => {
  it.each([
    ['/', '6v6'],
    ['/?gamemode=6v6', '6v6'],
    ['/?gamemode=9v9', '9v9'],
    ['/?foo=bar&gamemode=9v9', '9v9'],
    ['/?gamemode=bball', '6v6'],
    ['/?gamemode=bogus', '6v6'],
    ['not-a-url', '6v6'],
  ])('resolves %s to %s', (url, expected) => {
    expect(urlGamemode(url)).toBe(expected)
  })
})
