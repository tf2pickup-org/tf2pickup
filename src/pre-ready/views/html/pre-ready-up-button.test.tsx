import { describe, it, expect, vi, beforeEach } from 'vitest'
import { minutesToMilliseconds } from 'date-fns'

vi.mock('../../../players', () => ({
  players: {
    bySteamId: vi.fn(),
  },
}))

import { players } from '../../../players'
import { PreReadyUpButton } from './pre-ready-up-button'
import type { SteamId64 } from '../../../shared/types/steam-id-64'

const actor = '76561198000000001' as SteamId64

describe('PreReadyUpButton', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('does not query the database when preReadyUntil is provided as a prop', async () => {
    await PreReadyUpButton({ actor, preReadyUntil: undefined })

    expect(players.bySteamId).not.toHaveBeenCalled()
  })

  it('queries the database when preReadyUntil is not provided', async () => {
    vi.mocked(players.bySteamId).mockResolvedValue({ preReadyUntil: undefined } as never)

    await PreReadyUpButton({ actor })

    expect(players.bySteamId).toHaveBeenCalledWith(actor, ['preReadyUntil'])
  })

  it('is pressed and says so while pre-readied', async () => {
    const html = await PreReadyUpButton({
      actor,
      preReadyUntil: new Date(Date.now() + minutesToMilliseconds(1)),
    })

    expect(html).toContain('aria-pressed="true"')
    expect(html).toContain('Pre-readied')
    expect(html).not.toContain('aria-selected')
  })

  it('is not pressed otherwise', async () => {
    const html = await PreReadyUpButton({ actor, preReadyUntil: undefined })

    expect(html).toContain('aria-pressed="false"')
    expect(html).not.toContain('Pre-readied')
  })
})
