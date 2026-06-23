import { beforeEach, describe, expect, it, vi } from 'vitest'
import { shouldHideServerInfo } from './should-hide-server-info'
import { configuration } from '../configuration'
import { GameServerProvider } from '../database/models/game.model'
import { HideServerInfoMode } from '../shared/types/hide-server-info-mode'

vi.mock('../configuration', () => ({
  configuration: { get: vi.fn() },
}))

function gameServer(provider: GameServerProvider) {
  return {
    gameServer: {
      id: 'gs1',
      provider,
      name: 'server',
      address: '1.2.3.4',
      port: '27015',
      rcon: { address: '1.2.3.4', port: '27015', password: 'secret' },
    },
  }
}

describe('shouldHideServerInfo()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('never hides when mode is never', async () => {
    vi.mocked(configuration.get).mockResolvedValue(HideServerInfoMode.never)
    expect(await shouldHideServerInfo(gameServer(GameServerProvider.static))).toBe(false)
    expect(await shouldHideServerInfo(gameServer(GameServerProvider.servemeTf))).toBe(false)
  })

  it('always hides when mode is always', async () => {
    vi.mocked(configuration.get).mockResolvedValue(HideServerInfoMode.always)
    expect(await shouldHideServerInfo(gameServer(GameServerProvider.static))).toBe(true)
    expect(await shouldHideServerInfo(gameServer(GameServerProvider.servemeTf))).toBe(true)
  })

  it('hides only non-serveme.tf servers when mode is auto', async () => {
    vi.mocked(configuration.get).mockResolvedValue(HideServerInfoMode.auto)
    expect(await shouldHideServerInfo(gameServer(GameServerProvider.static))).toBe(true)
    expect(await shouldHideServerInfo(gameServer(GameServerProvider.tf2QuickServer))).toBe(true)
    expect(await shouldHideServerInfo(gameServer(GameServerProvider.servemeTf))).toBe(false)
  })

  it('hides when mode is auto and there is no game server yet', async () => {
    vi.mocked(configuration.get).mockResolvedValue(HideServerInfoMode.auto)
    expect(await shouldHideServerInfo({ gameServer: undefined })).toBe(true)
  })
})
