import { parse } from 'node-html-parser'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../../../database/collections', () => ({
  collections: {
    queueSlots: {
      countDocuments: vi.fn().mockResolvedValue(0),
    },
  },
}))

vi.mock('../../../shared/enabled-gamemodes', () => ({
  enabledGamemodes: ['6v6', '9v9'],
}))

import { Gamemode } from '../../../shared/types/gamemode'
import { GamemodeSelector } from './gamemode-selector'

describe('GamemodeSelector', () => {
  it('swaps only gamemode-dependent queue elements', async () => {
    const html = await GamemodeSelector({ active: Gamemode.sixes })
    const root = parse(html)
    const selector = root.querySelector('#gamemode-selector')
    const link = selector?.querySelector('a[href="/9v9"]')

    expect(selector).not.toBeNull()
    expect(link?.getAttribute('hx-target')).toBe('#queue')
    expect(link?.getAttribute('hx-select')).toBe('#queue')
    expect(link?.getAttribute('hx-select-oob')).toBe(
      '#gamemode-selector,#queue-state,#map-vote,#isInQueue,#mapVoteSelection,#queue-tab-label',
    )
    expect(link?.getAttribute('hx-swap')).toBe('outerHTML show:none')
  })
})
