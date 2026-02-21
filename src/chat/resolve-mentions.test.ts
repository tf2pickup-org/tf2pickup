import { describe, expect, it, vi } from 'vitest'
import { resolveMentions } from './resolve-mentions'

vi.mock('../database/collections', () => ({
  collections: {
    players: {
      findOne: vi.fn().mockImplementation(({ name }: { name: { $regex: RegExp } }) => {
        if (name.$regex.test('wonszu')) {
          return Promise.resolve({ steamId: '76561198012345678' })
        }
        if (name.$regex.test('deli')) {
          return Promise.resolve({ steamId: '76561198087654321' })
        }
        if (name.$regex.test('big boss')) {
          return Promise.resolve({ steamId: '76561198011111111' })
        }
        return Promise.resolve(null)
      }),
    },
  },
}))

describe('resolveMentions', () => {
  it('should resolve a single mention', async () => {
    const result = await resolveMentions('hello @wonszu')
    expect(result.body).toBe('hello @<76561198012345678>')
    expect(result.mentions).toEqual(['76561198012345678'])
  })

  it('should resolve multiple mentions', async () => {
    const result = await resolveMentions('@deli @wonszu dodawaj sie')
    expect(result.body).toBe('@<76561198087654321> @<76561198012345678> dodawaj sie')
    expect(result.mentions).toEqual(['76561198087654321', '76561198012345678'])
  })

  it('should leave unmatched mentions as-is', async () => {
    const result = await resolveMentions('hello @nobody')
    expect(result.body).toBe('hello @nobody')
    expect(result.mentions).toEqual([])
  })

  it('should handle message with no mentions', async () => {
    const result = await resolveMentions('hello world')
    expect(result.body).toBe('hello world')
    expect(result.mentions).toEqual([])
  })

  it('should not duplicate mentions for same player mentioned twice', async () => {
    const result = await resolveMentions('@wonszu hello @wonszu')
    expect(result.mentions).toEqual(['76561198012345678'])
  })

  it('should resolve quoted mention with spaces', async () => {
    const result = await resolveMentions('hello @&quot;big boss&quot;')
    expect(result.body).toBe('hello @<76561198011111111>')
    expect(result.mentions).toEqual(['76561198011111111'])
  })

  it('should resolve mixed quoted and unquoted mentions', async () => {
    const result = await resolveMentions('@wonszu @&quot;big boss&quot; dodawaj sie')
    expect(result.body).toBe('@<76561198012345678> @<76561198011111111> dodawaj sie')
    expect(result.mentions).toEqual(['76561198012345678', '76561198011111111'])
  })

  it('should leave unmatched quoted mentions as-is', async () => {
    const result = await resolveMentions('hello @&quot;unknown player&quot;')
    expect(result.body).toBe('hello @&quot;unknown player&quot;')
    expect(result.mentions).toEqual([])
  })
})
