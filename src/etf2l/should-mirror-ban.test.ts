import { describe, expect, it } from 'vitest'
import { shouldMirrorBan } from './should-mirror-ban'
import { configurationSchema } from '../database/models/configuration-entry.model'

const seed = configurationSchema.parse({ key: 'players.etf2l_ban_sync_reasons' }).value as string[]

describe('shouldMirrorBan()', () => {
  it('mirrors every ban when the list is empty', () => {
    expect(shouldMirrorBan('Toxicity', [])).toBe(true)
  })

  it('matches case-insensitive substrings', () => {
    expect(shouldMirrorBan('Cheating (Mirror)', ['cheating'])).toBe(true)
  })

  it('skips non-matching reasons', () => {
    expect(shouldMirrorBan('Toxicity', seed)).toBe(false)
  })

  it('matches any entry of the seed list', () => {
    expect(shouldMirrorBan('Wallhack/ESP+Aimbot', seed)).toBe(true)
  })
})
