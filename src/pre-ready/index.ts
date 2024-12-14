import fp from 'fastify-plugin'
import { cancel } from './cancel'
import { isPreReadied } from './is-pre-readied'
import { start } from './start'
import { toggle } from './toggle'
import { resolve } from 'node:path'

export const preReady = {
  cancel,
  isPreReadied,
  start,
  toggle,
} as const

export default fp(
  async app => {
    await app.register((await import('@fastify/autoload')).default, {
      dir: resolve(import.meta.dirname, 'plugins'),
    })
  },
  { name: 'pre-ready up' },
)
