import { KnownEndpoint } from '@tf2pickup-org/serveme-tf-client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const configuration = vi.hoisted(() => new Map<string, unknown>([]))
vi.mock('../configuration', () => ({
  configuration: {
    get: vi.fn().mockImplementation((key: string) => Promise.resolve(configuration.get(key))),
  },
}))

import { getClient, isEnabled } from './client'

describe('getClient()', () => {
  beforeEach(() => {
    configuration.set('serveme_tf.enabled', false)
    configuration.set('serveme_tf.api_endpoint', KnownEndpoint.europe)
    configuration.set('serveme_tf.api_key', null)
  })

  describe('when the integration is enabled and the api key is set', () => {
    beforeEach(() => {
      configuration.set('serveme_tf.enabled', true)
      configuration.set('serveme_tf.api_key', 'fake-api-key')
    })

    it('should return a client', async () => {
      const client = await getClient()
      expect(client).not.toBeNull()
      expect(client?.endpoint).toBe(KnownEndpoint.europe)
    })

    it('should reflect the configured endpoint', async () => {
      configuration.set('serveme_tf.api_endpoint', KnownEndpoint.northAmerica)
      const client = await getClient()
      expect(client?.endpoint).toBe(KnownEndpoint.northAmerica)
    })

    it('isEnabled() should be true', async () => {
      expect(await isEnabled()).toBe(true)
    })
  })

  describe('when the integration is disabled', () => {
    it('should return null', async () => {
      expect(await getClient()).toBeNull()
    })

    it('isEnabled() should be false', async () => {
      expect(await isEnabled()).toBe(false)
    })
  })

  describe('when the api key is not set', () => {
    beforeEach(() => {
      configuration.set('serveme_tf.enabled', true)
    })

    it('should return null', async () => {
      expect(await getClient()).toBeNull()
    })

    it('isEnabled() should be false', async () => {
      expect(await isEnabled()).toBe(false)
    })
  })

  describe('when the configuration changes between calls', () => {
    it('should pick up the new configuration', async () => {
      expect(await getClient()).toBeNull()

      configuration.set('serveme_tf.enabled', true)
      configuration.set('serveme_tf.api_key', 'fake-api-key')
      expect(await getClient()).not.toBeNull()

      configuration.set('serveme_tf.enabled', false)
      expect(await getClient()).toBeNull()
    })
  })
})
