import { describe, expect, it, vi } from 'vitest'
import { recordEloPageRender } from './record-elo-page-render'
import { collections } from '../database/collections'

vi.mock('../database/collections', () => ({
  collections: { telemetryStats: { updateOne: vi.fn() } },
}))

describe('recordEloPageRender', () => {
  it('increments the daily counter', async () => {
    await recordEloPageRender()
    expect(collections.telemetryStats.updateOne).toHaveBeenCalledWith(
      { day: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) as unknown },
      { $inc: { eloPageRenders: 1 } },
      { upsert: true },
    )
  })
})
