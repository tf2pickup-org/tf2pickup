import { ObjectId } from 'mongodb'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { refreshQueuePrompts } from './refresh-queue-prompts'
import { collections } from '../database/collections'
import { queues } from '../queues'
import { getSlots } from '../queues/auto/get-slots'
import { getMessage } from './get-message'
import type { EmbedBuilder } from 'discord.js'

vi.mock('../environment', () => ({ environment: { WEBSITE_URL: 'https://tf2pickup.test' } }))
vi.mock('./client', () => ({ client: { guilds: { cache: new Map() } } }))
vi.mock('../logger', () => ({ logger: { warn: vi.fn() } }))
vi.mock('../configuration', () => ({
  configuration: {
    get: vi
      .fn()
      .mockResolvedValue([{ id: 'guild', queuePrompts: { bumpPlayerThresholdRatio: 0.5 } }]),
  },
}))
vi.mock('../database/collections', () => ({
  collections: { discordBotState: { findOne: vi.fn(), updateOne: vi.fn() } },
}))
vi.mock('../queues', () => ({
  queues: { listEnabled: vi.fn(), queuePageUrl: (slug: string) => `/q/${slug}` },
}))
vi.mock('../queues/auto/get-slots', () => ({ getSlots: vi.fn() }))
vi.mock('../queues/auto/get-map-vote-results', () => ({
  getMapVoteResults: vi.fn().mockResolvedValue({}),
}))
vi.mock('./get-message', () => ({ getMessage: vi.fn() }))

const channel = {
  guild: { id: 'guild' },
  guildId: 'guild',
  send: vi.fn().mockResolvedValue({ id: 'new-message' }),
}
vi.mock('./for-each-enabled-channel', () => ({
  forEachEnabledChannel: vi.fn(async (_: string, fn: (c: unknown) => Promise<void>) => {
    await fn(channel)
  }),
}))

const sixes = { _id: new ObjectId(), slug: 'auto-6v6', name: '6v6', gamemode: '6v6' }
const ultiduo = { _id: new ObjectId(), slug: 'duo', name: 'Ultiduo', gamemode: 'ultiduo' }

function slots(taken: number, total: number) {
  return Array.from({ length: total }, (_, i) => ({
    gameClass: 'soldier',
    player: i < taken ? { name: `player${i}` } : null,
  }))
}

function title(embed: unknown) {
  return (embed as EmbedBuilder).data.title
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getMessage).mockResolvedValue(undefined)
  vi.mocked(collections.discordBotState.findOne).mockResolvedValue(null)
})

describe('refreshQueuePrompts()', () => {
  it('posts a prompt per queue that reached the threshold, under that queue', async () => {
    vi.mocked(queues.listEnabled).mockResolvedValue([sixes, ultiduo] as never)
    vi.mocked(getSlots).mockImplementation(
      async queue => (queue.equals(sixes._id) ? slots(2, 12) : slots(2, 4)) as never,
    )

    await refreshQueuePrompts()

    expect(channel.send).toHaveBeenCalledTimes(1)
    const [{ embeds }] = channel.send.mock.calls[0] as [{ embeds: unknown[] }]
    expect(title(embeds[0])).toBe('**2/4 players in the Ultiduo queue!**')
    expect((embeds[0] as EmbedBuilder).data.description).toContain('(https://tf2pickup.test/q/duo)')
    expect(collections.discordBotState.updateOne).toHaveBeenCalledWith(
      { guildId: 'guild' },
      { $set: { [`promptMessageIds.${ultiduo._id.toHexString()}`]: 'new-message' } },
      { upsert: true },
    )
  })

  it("edits each queue's own message", async () => {
    vi.mocked(queues.listEnabled).mockResolvedValue([sixes, ultiduo] as never)
    vi.mocked(getSlots).mockResolvedValue(slots(1, 4) as never)
    vi.mocked(collections.discordBotState.findOne).mockResolvedValue({
      guildId: 'guild',
      promptMessageIds: { [sixes._id.toHexString()]: 'sixes-message' },
    } as never)
    const edit = vi.fn()
    vi.mocked(getMessage).mockImplementation(async (_, id) =>
      id === 'sixes-message' ? ({ edit } as never) : undefined,
    )

    await refreshQueuePrompts()

    expect(edit).toHaveBeenCalledTimes(1)
    expect(title((edit.mock.calls[0]![0] as { embeds: unknown[] }).embeds[0])).toBe(
      '**1/4 players in the 6v6 queue!**',
    )
    expect(channel.send).not.toHaveBeenCalled()
  })

  it('leaves the queue name out when only one queue is enabled', async () => {
    vi.mocked(queues.listEnabled).mockResolvedValue([sixes] as never)
    vi.mocked(getSlots).mockResolvedValue(slots(6, 12) as never)

    await refreshQueuePrompts()

    const [{ embeds }] = channel.send.mock.calls[0] as [{ embeds: unknown[] }]
    expect(title(embeds[0])).toBe('**6/12 players in the queue!**')
  })
})
