import { ObjectId } from 'mongodb'
import { describe, expect, it } from 'vitest'
import type { QueueId, QueueModel } from '../database/models/queue.model'
import { planQueues } from './plan-queues'

function queue(slug: string, gamemode: string, enabled: boolean, position = 0) {
  return {
    _id: new ObjectId() as QueueId,
    slug,
    gamemode,
    enabled,
    position,
    name: slug,
  } as QueueModel
}

describe('planQueues()', () => {
  it("enables the primary's counterpart of an enabled incoming queue with its settings", () => {
    const primary = [queue('auto-6v6', '6v6', true, 0), queue('auto-9v9', '9v9', false, 1)]
    const incoming = { ...queue('auto-9v9', '9v9', true), readyUpTimeout: 1234 }
    const plan = planQueues(primary, [incoming], new Set())
    expect(plan.updates).toEqual([{ ...incoming, _id: primary[1]!._id, position: 1 }])
    expect(plan.inserts).toEqual([])
    expect(plan.idMap.get(incoming._id.toHexString())).toBe(primary[1]!._id)
  })

  it('keeps the settings of an enabled primary queue', () => {
    const primary = [queue('auto-6v6', '6v6', true)]
    const incoming = queue('auto-6v6', '6v6', true)
    const plan = planQueues(primary, [incoming], new Set())
    expect(plan.updates).toEqual([])
    expect(plan.idMap.get(incoming._id.toHexString())).toBe(primary[0]!._id)
  })

  it('adds incoming queues in use that the primary does not have, after its own', () => {
    const primary = [queue('auto-6v6', '6v6', true, 0), queue('auto-9v9', '9v9', false, 4)]
    const custom = queue('mix', 'ultiduo', true)
    const retired = queue('old', 'bball', false)
    const unused = queue('never', 'bball', false)
    const plan = planQueues(
      primary,
      [custom, retired, unused],
      new Set([retired._id.toHexString()]),
    )
    expect(plan.inserts.map(({ slug, position }) => [slug, position])).toEqual([
      ['mix', 5],
      ['old', 6],
    ])
    expect(plan.inserts[1]!.enabled).toBe(false)
    expect(plan.idMap.has(unused._id.toHexString())).toBe(false)
  })

  it('refuses queues sharing a slug across gamemodes', () => {
    expect(() =>
      planQueues([queue('mix', '6v6', true)], [queue('mix', '9v9', true)], new Set()),
    ).toThrow(/mix is 6v6 on the primary/)
  })
})
