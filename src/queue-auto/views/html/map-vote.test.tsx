import { beforeEach, describe, expect, it, vi } from 'vitest'
import { parse } from 'node-html-parser'
import { MapResult, MapVote } from './map-vote'
import { collections } from '../../../database/collections'
import { getMapVoteResults } from '../../get-map-vote-results'

vi.mock('../../../database/collections', () => ({
  collections: {
    queueMapOptions: {
      find: vi.fn(),
    },
  },
}))

vi.mock('../../get-map-vote-results', () => ({
  getMapVoteResults: vi.fn(),
}))

vi.mock('../../../html/components/map-thumbnail', () => ({
  MapThumbnail: () => '',
}))

describe('MapResult', () => {
  it('renders 0 when there are no votes', async () => {
    const html = await MapResult({ results: {}, map: 'cp_badlands' })
    const root = parse(html)
    expect(root.querySelector('#map-result-cp_badlands')?.text).toBe('0')
  })

  it('renders 100 when all votes are for this map', async () => {
    const html = await MapResult({ results: { cp_badlands: 3 }, map: 'cp_badlands' })
    const root = parse(html)
    expect(root.querySelector('#map-result-cp_badlands')?.text).toBe('100')
  })

  it('renders 0 when the map is not in the results', async () => {
    const html = await MapResult({ results: { cp_granary: 2 }, map: 'cp_badlands' })
    const root = parse(html)
    expect(root.querySelector('#map-result-cp_badlands')?.text).toBe('0')
  })

  it('renders 50 for an even split', async () => {
    const html = await MapResult({ results: { cp_badlands: 1, cp_granary: 1 }, map: 'cp_badlands' })
    const root = parse(html)
    expect(root.querySelector('#map-result-cp_badlands')?.text).toBe('50')
  })

  it('rounds the vote percentage correctly', async () => {
    const html = await MapResult({ results: { cp_badlands: 1, cp_granary: 2 }, map: 'cp_badlands' })
    const root = parse(html)
    // 1/3 = 33.33... → rounds to 33
    expect(root.querySelector('#map-result-cp_badlands')?.text).toBe('33')
  })
})

describe('MapVote', () => {
  beforeEach(() => {
    vi.mocked(collections.queueMapOptions.find).mockReturnValue({
      toArray: vi.fn().mockResolvedValue([{ name: 'cp_badlands' }, { name: 'cp_granary' }]),
    } as unknown as ReturnType<typeof collections.queueMapOptions.find>)
    vi.mocked(getMapVoteResults).mockResolvedValue({})
  })

  it('renders one vote button per map option', async () => {
    const html = await MapVote({})
    const root = parse(html)
    const buttons = root.querySelectorAll('.map-vote-button')
    expect(buttons).toHaveLength(2)
  })

  it('renders vote buttons with the correct map names', async () => {
    const html = await MapVote({})
    const root = parse(html)
    const buttons = root.querySelectorAll('.map-vote-button')
    expect(buttons[0]?.getAttribute('value')).toBe('cp_badlands')
    expect(buttons[1]?.getAttribute('value')).toBe('cp_granary')
  })
})
