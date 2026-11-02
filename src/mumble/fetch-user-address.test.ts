import { describe, expect, it, vi } from 'vitest'
import type { User } from '@tf2pickup-org/mumble-client'
import { fetchUserAddress } from './fetch-user-address'

describe('fetchUserAddress()', () => {
  it('sends one command for concurrent lookups', async () => {
    const user = { fetchAddress: vi.fn().mockResolvedValue('1.2.3.4') } as unknown as User
    await expect(
      Promise.all(Array.from({ length: 12 }, () => fetchUserAddress(user))),
    ).resolves.toEqual(Array(12).fill('1.2.3.4'))
    expect(user.fetchAddress).toHaveBeenCalledTimes(1)
  })

  it('retries after a failed lookup', async () => {
    const user = {
      fetchAddress: vi
        .fn()
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValue('1.2.3.4'),
    } as unknown as User
    await expect(fetchUserAddress(user)).rejects.toThrow('timeout')
    await expect(fetchUserAddress(user)).resolves.toEqual('1.2.3.4')
  })
})
