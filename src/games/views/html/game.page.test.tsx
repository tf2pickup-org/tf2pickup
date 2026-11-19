import { expect, it, vi } from 'vitest'
import { GamePage } from './game.page'
import type { GameNumber } from '../../../database/models/game.model'

vi.mock('../../../environment', () => ({
  environment: new Proxy(
    { MONGODB_URI: 'mongodb://localhost/x', LOG_LEVEL: 'silent', NODE_ENV: 'test' } as Record<
      string,
      string
    >,
    { get: (target, key: string) => target[key] ?? 'x' },
  ),
}))
vi.mock('../../../database/collections', () => ({ collections: {} }))
const findOne = vi.hoisted(() => vi.fn())
vi.mock('../../find-one', () => ({ findOne }))
vi.mock('@fastify/request-context', () => ({ requestContext: { get: () => undefined } }))

it('loads the fields the captain crown depends on', async () => {
  findOne.mockRejectedValue(new Error('stop'))
  await expect(GamePage({ number: 1 as GameNumber })).rejects.toThrow('stop')
  expect(findOne).toHaveBeenCalledWith(
    { number: 1 },
    expect.arrayContaining(['launchMode', 'captains', 'slots']),
  )
})
