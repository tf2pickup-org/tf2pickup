import { describe, expect, it, vi } from 'vitest'
import { parse } from 'node-html-parser'
import { ObjectId } from 'mongodb'
import { SetTitle } from './set-title'
import type { QueueModel } from '../../../../database/models/queue.model'

vi.mock('../../../../environment', () => ({ environment: { WEBSITE_NAME: 'tf2pickup.org' } }))
vi.mock('../../../../database/collections', () => ({
  collections: {
    queueSlots: {
      countDocuments: vi.fn((filter: object) => Promise.resolve('player' in filter ? 3 : 12)),
    },
  },
}))

const queue = { _id: new ObjectId(), slug: '6v6' } as QueueModel

async function run() {
  const script = parse(await SetTitle({ queue })).querySelector('script')!.text
  const document = { title: 'game #19 • tf2pickup.org' }
  new Function('document', script)(document)
  return document.title
}

describe('SetTitle', () => {
  it('sets the player count on the queue page', async () => {
    expect(await run()).toBe('[3/12] tf2pickup.org')
  })
})
