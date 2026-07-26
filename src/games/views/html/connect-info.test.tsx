import { beforeEach, describe, expect, it, vi } from 'vitest'
import { parse } from 'node-html-parser'
import { ConnectInfo } from './connect-info'
import { GameState } from '../../../database/models/game.model'
import type { GameNumber } from '../../../database/models/game.model'
import { PlayerConnectionStatus, SlotStatus } from '../../../database/models/game-slot.model'
import type { GameSlotId } from '../../../shared/types/game-slot-id'
import { Tf2ClassName } from '../../../shared/types/tf2-class-name'
import { Tf2Team } from '../../../shared/types/tf2-team'
import type { SteamId64 } from '../../../shared/types/steam-id-64'
import { configuration } from '../../../configuration'
import { HideServerInfoMode } from '../../../shared/types/hide-server-info-mode'
import { players } from '../../../players'

vi.mock('../../../configuration', () => ({
  configuration: { get: vi.fn() },
}))

vi.mock('../../../players', () => ({
  players: { isAdmin: vi.fn() },
}))

const participant = '76561198000000001' as SteamId64
const spectator = '76561198000000002' as SteamId64
const admin = '76561198000000003' as SteamId64

const activeSlot = {
  id: 'red-soldier-0' as GameSlotId,
  player: participant,
  team: Tf2Team.red,
  gameClass: Tf2ClassName.soldier,
  status: SlotStatus.active,
  connectionStatus: PlayerConnectionStatus.connected,
}

const baseGame = {
  number: 1 as GameNumber,
  state: GameState.started,
  slots: [activeSlot],
  connectString: 'connect 192.168.1.1:27015; password abc',
  stvConnectString: 'connect 192.168.1.1:27020',
}

function connectStringText(html: string) {
  return parse(html).querySelector('.connect-string .content')?.text.trim()
}

describe('ConnectInfo', () => {
  beforeEach(() => {
    vi.mocked(configuration.get).mockResolvedValue(HideServerInfoMode.never)
    vi.mocked(players.isAdmin).mockResolvedValue(false)
  })

  it('shows the game connect string to a participant', async () => {
    const html = await ConnectInfo({ game: baseGame, actor: participant })
    expect(connectStringText(html)).toBe('connect 192.168.1.1:27015; password abc')
  })

  it('shows the stv connect string to a spectator when server info is not hidden', async () => {
    const html = await ConnectInfo({ game: baseGame, actor: spectator })
    expect(connectStringText(html)).toBe('connect 192.168.1.1:27020')
  })

  it('hides the connect string from a spectator when server info is hidden', async () => {
    vi.mocked(configuration.get).mockResolvedValue(HideServerInfoMode.always)
    const html = await ConnectInfo({ game: baseGame, actor: spectator })
    expect(connectStringText(html)).toBe('hidden')
  })

  it('hides the connect string from anonymous visitors when server info is hidden', async () => {
    vi.mocked(configuration.get).mockResolvedValue(HideServerInfoMode.always)
    const html = await ConnectInfo({ game: baseGame, actor: undefined })
    expect(connectStringText(html)).toBe('hidden')
  })

  it('still shows the stv connect string to an admin when server info is hidden', async () => {
    vi.mocked(configuration.get).mockResolvedValue(HideServerInfoMode.always)
    vi.mocked(players.isAdmin).mockResolvedValue(true)
    const html = await ConnectInfo({ game: baseGame, actor: admin })
    expect(connectStringText(html)).toBe('connect 192.168.1.1:27020')
  })

  it('still shows the game connect string to a participant when server info is hidden', async () => {
    vi.mocked(configuration.get).mockResolvedValue(HideServerInfoMode.always)
    const html = await ConnectInfo({ game: baseGame, actor: participant })
    expect(connectStringText(html)).toBe('connect 192.168.1.1:27015; password abc')
  })
})
