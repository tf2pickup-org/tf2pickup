import fp from 'fastify-plugin'
import { getSnapshot } from './get-snapshot'

export const chat = {
  getSnapshot,
} as const

export default fp(async app => {
  await app.register((await import('./routes')).default)
})
