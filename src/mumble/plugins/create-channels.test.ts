import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('fastify-plugin', () => ({
  default: <T>(fn: T): T => fn,
}))

vi.mock('../../events', () => ({
  events: {
    on: vi.fn(),
  },
}))

vi.mock('../../utils/safe', () => ({
  safe: <T>(fn: T): T => fn,
}))

vi.mock('../../games', () => ({
  games: {
    update: vi.fn(),
  },
}))

vi.mock('../client', () => ({
  client: {},
}))

vi.mock('../mumble-direct-url', () => ({
  mumbleDirectUrl: vi.fn(),
}))

vi.mock('../setup-game-channels', () => ({ setupGameChannels: vi.fn() }))
vi.mock('../is-verification-enabled', () => ({ isVerificationEnabled: vi.fn() }))
vi.mock('../sync-game-acl', () => ({ syncGameAcl: vi.fn() }))
vi.mock('../../logger', () => ({ logger: { info: vi.fn() } }))

import { events } from '../../events'
import { games } from '../../games'
import { mumbleDirectUrl } from '../mumble-direct-url'
import plugin from './create-channels'
import type { Events } from '../../events'
import type { GameModel, GameNumber } from '../../database/models/game.model'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import type { GameSlotId } from '../../shared/types/game-slot-id'

describe('create-channels', () => {
  let playerReplaced: (params: Events['game:playerReplaced']) => Promise<void>

  beforeEach(async () => {
    vi.resetAllMocks()
    vi.mocked(mumbleDirectUrl).mockResolvedValue(new URL('mumble://sub@mumble.example/5/RED'))
    await (plugin as unknown as () => Promise<void>)()
    const call = vi.mocked(events.on).mock.calls.find(([event]) => event === 'game:playerReplaced')
    playerReplaced = call![1] as typeof playerReplaced
  })

  it("sets the substitute's voice URL on the replaced slot", async () => {
    await playerReplaced({
      game: { number: 5 as GameNumber } as GameModel,
      replacee: '76561198000000001' as SteamId64,
      replacement: '76561198000000002' as SteamId64,
      slotId: 'red-soldier-1' as GameSlotId,
    })

    expect(games.update).toHaveBeenCalledWith(
      5,
      { $set: { 'slots.$[slot].voiceServerUrl': 'mumble://sub@mumble.example/5/RED' } },
      { arrayFilters: [{ 'slot.id': 'red-soldier-1' }] },
    )
  })
})
