import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../../../players', () => ({
  players: {
    bySteamId: vi.fn(),
    update: vi.fn(),
  },
}))

import { players } from '../../../../../players'

describe('profile edit POST — name tracking', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('pushes old name to nameHistory when name changes', async () => {
    vi.mocked(players.bySteamId).mockResolvedValue({ name: 'OldName' } as any)
    vi.mocked(players.update).mockResolvedValue({} as any)

    const steamId = '76561198000000000' as any
    const newName = 'NewName'
    const cooldownLevel = 0
    const adminId = '76561198000000001' as any

    const before = await players.bySteamId(steamId, ['name'])
    const updateDoc: any = { $set: { name: newName, cooldownLevel } }
    if (before.name !== newName) {
      updateDoc.$push = { nameHistory: { name: before.name, changedAt: expect.any(Date) } }
    }
    await players.update(steamId, updateDoc, {}, adminId)

    expect(players.update).toHaveBeenCalledWith(
      steamId,
      expect.objectContaining({
        $set: { name: 'NewName', cooldownLevel: 0 },
        $push: { nameHistory: { name: 'OldName', changedAt: expect.any(Date) } },
      }),
      {},
      adminId,
    )
  })

  it('does NOT push nameHistory when name is unchanged', async () => {
    vi.mocked(players.bySteamId).mockResolvedValue({ name: 'SameName' } as any)
    vi.mocked(players.update).mockResolvedValue({} as any)

    const steamId = '76561198000000000' as any
    const newName = 'SameName'
    const cooldownLevel = 0
    const adminId = '76561198000000001' as any

    const before = await players.bySteamId(steamId, ['name'])
    const updateDoc: any = { $set: { name: newName, cooldownLevel } }
    if (before.name !== newName) {
      updateDoc.$push = { nameHistory: { name: before.name, changedAt: new Date() } }
    }
    await players.update(steamId, updateDoc, {}, adminId)

    expect(players.update).toHaveBeenCalledWith(
      steamId,
      { $set: { name: 'SameName', cooldownLevel: 0 } },
      {},
      adminId,
    )
  })
})
