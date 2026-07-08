import { describe, expect, it, vi } from 'vitest'
import { queuePageGamemode } from './queue-page-gamemode'

vi.mock('./enabled-gamemodes', () => ({
  enabledGamemodes: ['6v6', '9v9'],
  defaultGamemode: '6v6',
}))

describe('queuePageGamemode', () => {
  it.each([
    ['/', '6v6'],
    ['/6v6', '6v6'],
    ['/9v9', '9v9'],
    ['/bball', undefined],
    ['/games', undefined],
    ['/9v9?foo=bar', '9v9'],
    ['not-a-url', undefined],
  ])('resolves %s to %s', (url, expected) => {
    expect(queuePageGamemode(url)).toBe(expected)
  })
})
