import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./auto/kick', () => ({ kick: vi.fn() }))
vi.mock('./captain/kick-from-pools', () => ({ kickFromPools: vi.fn() }))

import type { SteamId64 } from '../shared/types/steam-id-64'
import { kick as autoKick } from './auto/kick'
import { kickFromPools } from './captain/kick-from-pools'
import { kick } from './kick'

const player = '76561198000000001' as SteamId64

describe('kick()', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('kicks from auto queues and captain pools', async () => {
    await kick(player)
    expect(autoKick).toHaveBeenCalledWith(player)
    expect(kickFromPools).toHaveBeenCalledWith(player)
  })

  it('still kicks from captain pools when the auto kick fails, then rethrows', async () => {
    vi.mocked(autoKick).mockRejectedValueOnce(new Error('invalid queue state'))
    await expect(kick(player)).rejects.toThrow('invalid queue state')
    expect(kickFromPools).toHaveBeenCalledWith(player)
  })
})
