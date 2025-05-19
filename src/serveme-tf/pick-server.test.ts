import { beforeEach, describe, expect, it, vi } from 'vitest'
import { pickServer } from './pick-server'
import type { ServerId } from '@tf2pickup-org/serveme-tf-client'

const configuration = vi.hoisted(() => new Map<string, unknown>([]))
vi.mock('../configuration', () => ({
  configuration: {
    get: vi.fn().mockImplementation((key: string) => Promise.resolve(configuration.get(key))),
  },
}))

describe('pickServer()', () => {
  beforeEach(() => {
    configuration.set('serveme_tf.preferred_region', null)
    configuration.set('serveme_tf.ban_gameservers', [])
  })

  describe('when name is not provided', () => {
    it('should pick a gameserver randomly', async () => {
      expect(
        await pickServer([{ id: 42 as ServerId, flag: 'pl', name: 'FAKE_GAMESERVER_42' }]),
      ).toBe(42)
    })

    describe('when no gameservers are provided', () => {
      it('should throw', async () => {
        await expect(pickServer([])).rejects.toThrow()
      })
    })

    describe('when preferred region is set', () => {
      beforeEach(() => {
        configuration.set('serveme_tf.preferred_region', 'pl')
      })

      it('should pick a gameserver from the preferred region', async () => {
        expect(
          await pickServer([
            { id: 41 as ServerId, flag: 'de', name: 'FAKE_GAMESERVER_41' },
            {
              id: 42 as ServerId,
              flag: 'pl',
              name: 'FAKE_GAMESERVER_42',
            },
          ]),
        ).toEqual(42)
      })

      it('should pick another gameserver if preferred one is unavailable', async () => {
        expect(
          await pickServer([{ id: 41 as ServerId, flag: 'de', name: 'FAKE_GAMESERVER_41' }]),
        ).toEqual(41)
      })
    })

    describe('when some gameservers are banned', () => {
      beforeEach(() => {
        configuration.set('serveme_tf.ban_gameservers', ['bad gameserver'])
      })

      it('should not return banned gameservers', async () => {
        expect(
          await pickServer([
            { id: 41 as ServerId, flag: 'de', name: 'bad gameserver' },
            {
              id: 42 as ServerId,
              flag: 'pl',
              name: 'good gameserver',
            },
          ]),
        ).toBe(42)
      })

      describe('and no gameservers are matched', () => {
        it('should throw', async () => {
          await expect(
            pickServer([{ id: 41 as ServerId, flag: 'de', name: 'bad gameserver' }]),
          ).rejects.toThrow()
        })
      })
    })
  })

  describe('when a specific server is requested', () => {
    it('should pick the given gameserver', async () => {
      expect(
        await pickServer(
          [
            { id: 41 as ServerId, flag: 'de', name: 'FAKE_GAMESERVER_41' },
            { id: 42 as ServerId, flag: 'de', name: 'FAKE_GAMESERVER_42' },
          ],
          'FAKE_GAMESERVER_42',
        ),
      ).toEqual(42)
    })
  })

  describe('when anyOf is requested', () => {
    it('should pick the given gameserver', async () => {
      expect(
        await pickServer(
          [
            { id: 41 as ServerId, flag: 'de', name: 'FAKE_GAMESERVER_41' },
            { id: 42 as ServerId, flag: 'de', name: 'FAKE_GAMESERVER_42' },
          ],
          'anyOf:FAKE_GAMESERVER',
        ),
      ).toEqual(41)
    })
  })
})
