import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { upsert } from './upsert'
import { create } from './create'
import { getTf2InGameHours } from '../steam/get-tf2-in-game-hours'
import { etf2l } from '../etf2l'
import { Etf2lApiError } from '../etf2l/errors/etf2l-api.error'
import { PlayerRole } from '../database/models/player.model'

const mockPlayer = vi.hoisted(() => ({
  steamId: '76561198074409147',
  name: 'FAKE_PLAYER_NAME',
}))

vi.mock('../database/collections', () => ({
  collections: {
    players: {
      findOne: vi.fn().mockImplementation(({ steamId }: { steamId?: string }) => {
        if (steamId === mockPlayer.steamId) {
          return Promise.resolve(mockPlayer)
        }
        return Promise.resolve(null)
      }),
    },
  },
}))

const mockConfig = vi.hoisted(
  () =>
    new Map<string, unknown>([
      ['players.bypass_registration_restrictions', []],
      ['players.minimum_in_game_hours', 0],
      ['players.etf2l_account_required', false],
    ]),
)

vi.mock('../configuration', () => ({
  configuration: {
    get: vi.fn().mockImplementation((key: string) => Promise.resolve(mockConfig.get(key))),
  },
}))

vi.mock('../steam/get-tf2-in-game-hours', () => ({
  getTf2InGameHours: vi.fn().mockResolvedValue(1),
}))

vi.mock('../etf2l', () => ({
  etf2l: {
    getPlayerProfile: vi.fn(),
  },
}))

vi.mock('./create', () => ({
  create: vi.fn(),
}))
vi.mock('../logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
  },
}))

const mockEnv = vi.hoisted(() => ({ SUPER_USER: undefined as string | undefined }))
vi.mock('../environment', () => ({
  environment: mockEnv,
}))

const upsertedPlayer = {
  steamID: '76561198074409147',
  nickname: 'FAKE_PLAYER_NAME',
  avatar: {
    small: 'FAKE_AVATAR_SMALL',
    medium: 'FAKE_AVATAR_MEDIUM',
    large: 'FAKE_AVATAR_LARGE',
  },
}

describe('upsertPlayer()', () => {
  describe('when player exists', () => {
    it('should return existing player', async () => {
      const player = await upsert(upsertedPlayer)
      expect(player).toBe(mockPlayer)
    })
  })

  it('should create player', async () => {
    await upsert({ ...upsertedPlayer, steamID: '12345678901234567' })
    expect(create).toHaveBeenCalledWith({
      steamId: '12345678901234567',
      name: 'FAKE_PLAYER_NAME',
      avatar: {
        small: 'FAKE_AVATAR_SMALL',
        medium: 'FAKE_AVATAR_MEDIUM',
        large: 'FAKE_AVATAR_LARGE',
      },
    })
  })

  describe('and in-game hours verification is enabled', () => {
    beforeEach(() => {
      mockConfig.set('players.minimum_in_game_hours', 500)
    })

    afterEach(() => {
      mockConfig.set('players.minimum_in_game_hours', 0)
    })

    describe('and user does not meet the threshold', () => {
      beforeEach(() => {
        vi.mocked(getTf2InGameHours).mockResolvedValue(499)
      })

      it('should throw', async () => {
        await expect(upsert({ ...upsertedPlayer, steamID: '12345678901234567' })).rejects.toThrow(
          'insufficient TF2 in-game hours',
        )
      })

      describe('but the user is on bypass list', () => {
        beforeEach(() => {
          mockConfig.set('players.bypass_registration_restrictions', ['12345678901234567'])
        })

        afterEach(() => {
          mockConfig.set('players.bypass_registration_restrictions', [])
        })

        it('should create player', async () => {
          await upsert({ ...upsertedPlayer, steamID: '12345678901234567' })
          expect(create).toHaveBeenCalledWith({
            steamId: '12345678901234567',
            name: 'FAKE_PLAYER_NAME',
            avatar: {
              small: 'FAKE_AVATAR_SMALL',
              medium: 'FAKE_AVATAR_MEDIUM',
              large: 'FAKE_AVATAR_LARGE',
            },
          })
        })
      })

      describe('but the user is super-user', () => {
        beforeEach(() => {
          mockEnv.SUPER_USER = '12345678901234567'
        })

        afterEach(() => {
          mockEnv.SUPER_USER = undefined
        })

        it('should create player', async () => {
          await upsert({ ...upsertedPlayer, steamID: '12345678901234567' })
          expect(create).toHaveBeenCalledWith({
            steamId: '12345678901234567',
            name: 'FAKE_PLAYER_NAME',
            avatar: {
              small: 'FAKE_AVATAR_SMALL',
              medium: 'FAKE_AVATAR_MEDIUM',
              large: 'FAKE_AVATAR_LARGE',
            },
            roles: [PlayerRole.superUser],
          })
        })
      })
    })

    describe('and user meets the threshold', () => {
      beforeEach(() => {
        vi.mocked(getTf2InGameHours).mockResolvedValue(500)
      })

      it('should create player', async () => {
        await upsert({ ...upsertedPlayer, steamID: '12345678901234567' })
        expect(create).toHaveBeenCalledWith({
          steamId: '12345678901234567',
          name: 'FAKE_PLAYER_NAME',
          avatar: {
            small: 'FAKE_AVATAR_SMALL',
            medium: 'FAKE_AVATAR_MEDIUM',
            large: 'FAKE_AVATAR_LARGE',
          },
        })
      })
    })
  })

  describe('and etf2l profile verification is enabled', () => {
    beforeEach(() => {
      mockConfig.set('players.etf2l_account_required', true)
    })

    afterEach(() => {
      mockConfig.set('players.etf2l_account_required', false)
    })

    describe('and user does not have an etf2l.org account', () => {
      beforeEach(() => {
        vi.mocked(etf2l).getPlayerProfile.mockRejectedValue(
          new Etf2lApiError('', { status: 404 } as Response, 'Not Found'),
        )
      })

      it('should throw', async () => {
        await expect(upsert({ ...upsertedPlayer, steamID: '12345678901234567' })).rejects.toThrow(
          'ETF2L.org account is required',
        )
      })
    })

    describe('and user has active etf2l bans', () => {
      beforeEach(() => {
        vi.mocked(etf2l).getPlayerProfile.mockResolvedValue({
          bans: [
            {
              end: new Date(2195, 0, 1).getTime() / 1000,
            },
          ],
        })
      })

      it('should throw', async () => {
        await expect(upsert({ ...upsertedPlayer, steamID: '12345678901234567' })).rejects.toThrow(
          'you are banned on ETF2L.org',
        )
      })
    })
  })
})
