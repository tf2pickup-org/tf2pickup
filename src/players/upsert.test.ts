import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { upsert } from './upsert'
import { getTf2InGameHours } from '../steam/get-tf2-in-game-hours'
import { etf2l } from '../etf2l'
import { Etf2lApiError } from '../etf2l/errors/etf2l-api.error'
import { PlayerRole } from '../database/models/player.model'
import { collections } from '../database/collections'
import { ObjectId } from 'mongodb'
import { configurationSchema } from '../database/models/configuration-entry.model'
import { addDays, getUnixTime, subDays } from 'date-fns'

const mockPlayer = vi.hoisted(() => ({
  steamId: '76561198074409147',
  name: 'FAKE_PLAYER_NAME',
}))

const mockId = await vi.hoisted(async () => {
  return new (await import('mongodb')).ObjectId()
})

vi.mock('../database/collections', () => ({
  collections: {
    players: {
      insertOne: vi.fn().mockImplementation(() => ({ insertedId: mockId })),
      findOne: vi
        .fn()
        .mockImplementation(({ _id, steamId }: { _id?: ObjectId; steamId?: string }) => {
          if (_id === mockId) {
            return Promise.resolve(mockPlayer)
          }
          if (steamId === mockPlayer.steamId) {
            return Promise.resolve(mockPlayer)
          }
          return Promise.resolve(null)
        }),
      updateOne: vi.fn().mockImplementation(({ steamId }: { steamId: string }) => {
        if (steamId !== mockPlayer.steamId) {
          return Promise.reject()
        }
        return Promise.resolve()
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

vi.mock('../logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    warn: vi.fn(),
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

let now: Date

beforeEach(() => {
  // tell vitest we use mocked time
  vi.useFakeTimers()

  now = new Date(2000, 1, 1, 13)
  vi.setSystemTime(now)
})

afterEach(() => {
  // restoring date after each test run
  vi.useRealTimers()
})

describe('upsertPlayer()', () => {
  describe('when player exists', () => {
    it('should return existing player', async () => {
      const player = await upsert(upsertedPlayer)
      expect(player).toBe(mockPlayer)
    })

    it('should update player avatar', async () => {
      await upsert(upsertedPlayer)
      expect(collections.players.updateOne).toHaveBeenCalledWith(
        {
          steamId: '76561198074409147',
        },
        {
          $set: {
            avatar: {
              small: 'FAKE_AVATAR_SMALL',
              medium: 'FAKE_AVATAR_MEDIUM',
              large: 'FAKE_AVATAR_LARGE',
            },
          },
        },
      )
    })
  })

  it('should create player', async () => {
    await upsert({ ...upsertedPlayer, steamID: '12345678901234567' })
    expect(collections.players.insertOne).toHaveBeenCalledWith({
      steamId: '12345678901234567',
      joinedAt: now,
      name: 'FAKE_PLAYER_NAME',
      avatar: {
        small: 'FAKE_AVATAR_SMALL',
        medium: 'FAKE_AVATAR_MEDIUM',
        large: 'FAKE_AVATAR_LARGE',
      },
      roles: [],
      hasAcceptedRules: false,
      cooldownLevel: 0,
      preferences: {},
      stats: {
        totalGames: 0,
        gamesByClass: {},
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
          expect(collections.players.insertOne).toHaveBeenCalledWith({
            steamId: '12345678901234567',
            joinedAt: now,
            name: 'FAKE_PLAYER_NAME',
            avatar: {
              small: 'FAKE_AVATAR_SMALL',
              medium: 'FAKE_AVATAR_MEDIUM',
              large: 'FAKE_AVATAR_LARGE',
            },
            roles: [],
            hasAcceptedRules: false,
            cooldownLevel: 0,
            preferences: {},
            stats: {
              totalGames: 0,
              gamesByClass: {},
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
          expect(collections.players.insertOne).toHaveBeenCalledWith({
            steamId: '12345678901234567',
            joinedAt: now,
            name: 'FAKE_PLAYER_NAME',
            avatar: {
              small: 'FAKE_AVATAR_SMALL',
              medium: 'FAKE_AVATAR_MEDIUM',
              large: 'FAKE_AVATAR_LARGE',
            },
            roles: [PlayerRole.admin, PlayerRole.superUser],
            hasAcceptedRules: false,
            cooldownLevel: 0,
            preferences: {},
            stats: {
              totalGames: 0,
              gamesByClass: {},
            },
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
        expect(collections.players.insertOne).toHaveBeenCalledWith({
          steamId: '12345678901234567',
          joinedAt: now,
          name: 'FAKE_PLAYER_NAME',
          avatar: {
            small: 'FAKE_AVATAR_SMALL',
            medium: 'FAKE_AVATAR_MEDIUM',
            large: 'FAKE_AVATAR_LARGE',
          },
          roles: [],
          hasAcceptedRules: false,
          cooldownLevel: 0,
          preferences: {},
          stats: {
            totalGames: 0,
            gamesByClass: {},
          },
        })
      })
    })
  })

  describe('ETF2L registration restrictions', () => {
    const registration = { ...upsertedPlayer, steamID: '12345678901234567' }

    beforeEach(() => {
      vi.clearAllMocks()
      mockConfig.set('players.etf2l_account_required', false)
      mockConfig.set('players.etf2l_ban_sync', false)
      mockConfig.set(
        'players.etf2l_ban_sync_reasons',
        configurationSchema.parse({ key: 'players.etf2l_ban_sync_reasons' }).value,
      )
      vi.mocked(etf2l.getPlayerProfile).mockResolvedValue({
        id: 123,
        name: 'League name',
        country: 'Poland',
        bans: [
          {
            start: getUnixTime(subDays(now, 1)),
            end: getUnixTime(addDays(now, 1)),
            reason: 'Cheating (Mirror)',
          },
        ],
      })
    })

    afterEach(() => {
      mockConfig.set('players.etf2l_account_required', false)
      mockConfig.set('players.etf2l_ban_sync', false)
      mockConfig.set('players.bypass_registration_restrictions', [])
      mockEnv.SUPER_USER = undefined
    })

    it('rejects matching active bans independently of the account requirement', async () => {
      mockConfig.set('players.etf2l_ban_sync', true)
      await expect(upsert(registration)).rejects.toMatchObject({
        statusCode: 403,
        message: 'you are banned on ETF2L.org',
      })
      expect(collections.players.insertOne).not.toHaveBeenCalled()
      expect(etf2l.getPlayerProfile).toHaveBeenCalledExactlyOnceWith(registration.steamID)
    })

    it('fetches only once when both restrictions are enabled', async () => {
      mockConfig.set('players.etf2l_ban_sync', true)
      mockConfig.set('players.etf2l_account_required', true)
      await expect(upsert(registration)).rejects.toMatchObject({ statusCode: 403 })
      expect(etf2l.getPlayerProfile).toHaveBeenCalledTimes(1)
    })

    it.each(['non-matching', 'expired', 'ends now', 'no bans'])(
      'allows a player with %s bans and preserves the Steam name',
      async scenario => {
        mockConfig.set('players.etf2l_ban_sync', true)
        vi.mocked(etf2l.getPlayerProfile).mockResolvedValue({
          id: 123,
          name: 'League name',
          country: 'Poland',
          bans:
            scenario === 'no bans'
              ? null
              : [
                  {
                    start: getUnixTime(subDays(now, 2)),
                    end: getUnixTime(
                      scenario === 'expired'
                        ? subDays(now, 1)
                        : scenario === 'ends now'
                          ? now
                          : addDays(now, 1),
                    ),
                    reason: scenario === 'non-matching' ? 'Toxicity' : 'Cheating',
                  },
                ],
        })
        await upsert(registration)
        expect(collections.players.insertOne).toHaveBeenCalledWith(
          expect.objectContaining({ name: registration.nickname }),
        )
      },
    )

    it('mirrors every reason when the filter is empty', async () => {
      mockConfig.set('players.etf2l_ban_sync', true)
      mockConfig.set('players.etf2l_ban_sync_reasons', [])
      await expect(upsert(registration)).rejects.toMatchObject({ statusCode: 403 })
    })

    it('allows active bans when only the account is required and uses the league name', async () => {
      mockConfig.set('players.etf2l_account_required', true)
      await upsert(registration)
      expect(collections.players.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'League name' }),
      )
    })

    it.each([false, true])(
      'handles missing accounts with account required = %s',
      async required => {
        mockConfig.set('players.etf2l_account_required', required)
        mockConfig.set('players.etf2l_ban_sync', true)
        vi.mocked(etf2l.getPlayerProfile).mockRejectedValue(
          new Etf2lApiError('', { status: 404 } as Response, 'Not Found'),
        )
        if (required) {
          await expect(upsert(registration)).rejects.toMatchObject({
            statusCode: 403,
            message: 'ETF2L.org account is required',
          })
        } else {
          await upsert(registration)
          expect(collections.players.insertOne).toHaveBeenCalledTimes(1)
        }
      },
    )

    it.each([
      [false, new Etf2lApiError('', { status: 500 } as Response, 'Server Error')],
      [true, new Etf2lApiError('', { status: 500 } as Response, 'Server Error')],
      [false, new TypeError('fetch failed')],
      [true, new TypeError('fetch failed')],
    ])('fails closed on API failure with account required = %s', async (required, error) => {
      mockConfig.set('players.etf2l_account_required', required)
      mockConfig.set('players.etf2l_ban_sync', !required)
      vi.mocked(etf2l.getPlayerProfile).mockRejectedValue(error)
      await expect(upsert(registration)).rejects.toMatchObject({
        statusCode: 503,
        message: 'ETF2L.org is unavailable, please try again later',
      })
      expect(collections.players.insertOne).not.toHaveBeenCalled()
    })

    it('makes no ETF2L request with both restrictions disabled', async () => {
      vi.mocked(etf2l.getPlayerProfile).mockRejectedValue(new TypeError('fetch failed'))
      await upsert(registration)
      expect(etf2l.getPlayerProfile).not.toHaveBeenCalled()
      expect(collections.players.insertOne).toHaveBeenCalledTimes(1)
    })

    it.each(['bypass list', 'super user'])('skips both restrictions for the %s', async bypass => {
      mockConfig.set('players.etf2l_account_required', true)
      mockConfig.set('players.etf2l_ban_sync', true)
      if (bypass === 'bypass list') {
        mockConfig.set('players.bypass_registration_restrictions', [registration.steamID])
      } else {
        mockEnv.SUPER_USER = registration.steamID
      }
      await upsert(registration)
      expect(etf2l.getPlayerProfile).not.toHaveBeenCalled()
      expect(collections.players.insertOne).toHaveBeenCalledTimes(1)
    })
  })
})
