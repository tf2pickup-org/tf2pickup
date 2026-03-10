import { describe, it, expect, vi, beforeEach } from 'vitest'

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
})
