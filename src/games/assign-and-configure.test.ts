import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./assign-game-server', () => ({
  assignGameServer: vi.fn(),
}))

vi.mock('./rcon/configure', () => ({
  configure: vi.fn(),
}))

vi.mock('../logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}))

import { assignAndConfigure } from './assign-and-configure'
import { assignGameServer } from './assign-game-server'
import { configure } from './rcon/configure'
import type { GameNumber } from '../database/models/game.model'
import type { SteamId64 } from '../shared/types/steam-id-64'

const gameNumber = 1 as GameNumber
const actor = '76561198000000000' as SteamId64
const select = { selected: { provider: 'static' as const, id: 'srv-1' }, actor }

describe('assignAndConfigure()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(assignGameServer).mockResolvedValue(undefined)
    vi.mocked(configure).mockResolvedValue(undefined)
  })

  it('calls assignGameServer with the provided selection and actor', async () => {
    await assignAndConfigure(gameNumber, select)
    expect(assignGameServer).toHaveBeenCalledWith(gameNumber, select)
  })

  it('calls configure with the game number after assignment', async () => {
    await assignAndConfigure(gameNumber, select)
    await Promise.resolve() // flush microtask queue for fire-and-forget
    expect(configure).toHaveBeenCalledWith(gameNumber)
  })

  it('does not throw if configure fails', async () => {
    vi.mocked(configure).mockRejectedValue(new Error('configure failed'))
    await expect(assignAndConfigure(gameNumber, select)).resolves.toBeUndefined()
    await Promise.resolve()
  })

  it('throws and does not call configure if assignGameServer fails', async () => {
    vi.mocked(assignGameServer).mockRejectedValue(new Error('server not found'))
    await expect(assignAndConfigure(gameNumber, select)).rejects.toThrow('server not found')
    expect(configure).not.toHaveBeenCalled()
  })
})
