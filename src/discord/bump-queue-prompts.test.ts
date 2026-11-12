import { ObjectId } from 'mongodb'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { bumpQueuePrompts } from './bump-queue-prompts'
import { collections } from '../database/collections'
import { queues } from '../queues'
import { getSlots } from '../queues/auto/get-slots'
import { getMessage } from './get-message'

vi.mock('../database/collections', () => ({
  collections: { discordBotState: { findOne: vi.fn(), updateOne: vi.fn() } },
}))
vi.mock('../queues', () => ({ queues: { listEnabled: vi.fn() } }))
vi.mock('../queues/auto/get-slots', () => ({ getSlots: vi.fn() }))
vi.mock('./get-message', () => ({ getMessage: vi.fn() }))

const channel = {
  guild: { id: 'guild' },
  messages: { fetch: vi.fn() },
  send: vi.fn().mockResolvedValue({ id: 'reposted' }),
}
vi.mock('./for-each-enabled-channel', () => ({
  forEachEnabledChannel: vi.fn(
    async (_: string, fn: (c: unknown, config: unknown) => Promise<void>) => {
      await fn(channel, { bumpPlayerThresholdRatio: 0.5 })
    },
  ),
}))

const sixes = { _id: new ObjectId() }
const ultiduo = { _id: new ObjectId() }
const bball = { _id: new ObjectId() }

function message(id: string) {
  return { id, content: '', embeds: [id], delete: vi.fn() }
}
const messages = {
  sixes: message('sixes-message'),
  ultiduo: message('ultiduo-message'),
  bball: message('bball-message'),
}

function slots(taken: number, total: number) {
  return Array.from({ length: total }, (_, i) => ({ player: i < taken ? {} : null }))
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(queues.listEnabled).mockResolvedValue([sixes, ultiduo, bball] as never)
  vi.mocked(getSlots).mockImplementation(async queue => {
    if (queue.equals(bball._id)) {
      return slots(1, 4) as never
    }
    return slots(3, 4) as never
  })
  vi.mocked(collections.discordBotState.findOne).mockResolvedValue({
    guildId: 'guild',
    promptMessageIds: {
      [sixes._id.toHexString()]: messages.sixes.id,
      [ultiduo._id.toHexString()]: messages.ultiduo.id,
      [bball._id.toHexString()]: messages.bball.id,
    },
  } as never)
  vi.mocked(getMessage).mockImplementation(
    async (_, id) => Object.values(messages).find(m => m.id === id) as never,
  )
})

describe('bumpQueuePrompts()', () => {
  it('re-posts only the due prompts that are not at the bottom of the channel', async () => {
    channel.messages.fetch.mockResolvedValue(
      new Map([
        [messages.sixes.id, messages.sixes],
        ['chatter', {}],
      ]),
    )

    await bumpQueuePrompts()

    expect(channel.messages.fetch).toHaveBeenCalledWith({ limit: 2 })
    expect(messages.sixes.delete).not.toHaveBeenCalled()
    expect(messages.bball.delete).not.toHaveBeenCalled()
    expect(messages.ultiduo.delete).toHaveBeenCalled()
    expect(channel.send).toHaveBeenCalledExactlyOnceWith({
      content: '',
      embeds: ['ultiduo-message'],
    })
    expect(collections.discordBotState.updateOne).toHaveBeenCalledWith(
      { guildId: 'guild' },
      { $set: { [`promptMessageIds.${ultiduo._id.toHexString()}`]: 'reposted' } },
    )
  })

  it('leaves prompts alone when they share the bottom of the channel', async () => {
    channel.messages.fetch.mockResolvedValue(
      new Map([
        [messages.ultiduo.id, messages.ultiduo],
        [messages.sixes.id, messages.sixes],
      ]),
    )

    await bumpQueuePrompts()

    expect(channel.send).not.toHaveBeenCalled()
  })
})
