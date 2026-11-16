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

async function runAt(pathname: string) {
  const script = parse(await SetTitle({ queue })).querySelector('script')!.text
  const document = { title: 'game #19 • tf2pickup.org' }
  new Function('document', 'location', script)(document, { pathname })
  return document.title
}

describe('SetTitle', () => {
  it('sets the player count on the queue page', async () => {
    expect(await runAt('/q/6v6')).toBe('[3/12] tf2pickup.org')
  })

  it('leaves the title alone once the player has navigated away', async () => {
    expect(await runAt('/games/19')).toBe('game #19 • tf2pickup.org')
  })

  it('leaves the title alone on another queue page', async () => {
    expect(await runAt('/q/9v9')).toBe('game #19 • tf2pickup.org')
  })
})
