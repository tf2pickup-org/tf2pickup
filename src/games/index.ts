import fp from 'fastify-plugin'
import { update } from './update'
import { getSubstitutionRequests } from './get-substitution-requests'
import { resolve } from 'path'
import { findOne } from './find-one'

export const games = {
  findOne,
  getSubstitutionRequests,
  update,
} as const

export default fp(
  async app => {
    await app.register((await import('@fastify/autoload')).default, {
      dir: resolve(import.meta.dirname, 'plugins'),
    })
    await app.register((await import('./routes')).default)
  },
  {
    name: 'games',
  },
)
