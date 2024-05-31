import { collections, configurationSchema } from '@tf2pickup-org/database'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { get } from './get'

vi.mock('@tf2pickup-org/database', async () => ({
  collections: {
    configuration: {
      findOne: vi.fn(),
    },
  },
  configurationSchema: (
    await import('@tf2pickup-org/database/src/models/configuration-entry.model')
  ).configurationSchema,
}))

describe('when the configuration entry is found', () => {
  beforeEach(() => {
    vi.mocked(collections.configuration.findOne).mockResolvedValue({
      key: 'queue.ready_up_timeout',
      value: 45000,
    })
  })

  it('should return the value', async () => {
    const result = await get('queue.ready_up_timeout')
    expect(result).toBe(45000)
  })
})

describe('when the configuration entry is not found', () => {
  beforeEach(() => {
    vi.mocked(collections.configuration.findOne).mockResolvedValue(null)
  })

  it('should return the default value', async () => {
    const result = await get('queue.ready_up_timeout')
    expect(result).toBe(40000)
  })
})
