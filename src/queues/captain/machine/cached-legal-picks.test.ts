import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../legal-picks', () => ({ legalPicks: vi.fn(() => []) }))

import { ObjectId } from 'mongodb'
import type { CaptainDraftModel } from '../../../database/models/captain-draft.model'
import { cachedLegalPicks } from './cached-legal-picks'
import { legalPicks } from '../legal-picks'
import { legalPicksCache } from './legal-picks-cache'
import type { DraftPosition } from '../types/draft-position'

const queue = new ObjectId()
const position = {} as DraftPosition
const draft = (picks: number, token = 'a') =>
  ({ queue, token, picks: Array.from({ length: picks }) }) as unknown as CaptainDraftModel

beforeEach(() => {
  vi.clearAllMocks()
  legalPicksCache.clear()
})

describe('cachedLegalPicks()', () => {
  it('computes once per position, however many viewers ask', () => {
    for (let viewers = 0; viewers < 30; viewers++) {
      cachedLegalPicks(draft(2), position)
    }
    expect(legalPicks).toHaveBeenCalledTimes(1)
  })

  it('computes again after a pick or for another draft', () => {
    cachedLegalPicks(draft(2), position)
    cachedLegalPicks(draft(3), position)
    cachedLegalPicks(draft(3, 'b'), position)
    expect(legalPicks).toHaveBeenCalledTimes(3)
  })
})
