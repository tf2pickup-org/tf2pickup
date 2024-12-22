import fp from 'fastify-plugin'
import { assign } from './assign'
import { client } from './client'
import { listRegions } from './list-regions'
import { resolve } from 'node:path'
import { waitForStart } from './wait-for-start'

export const servemeTf = {
  assign,
  isEnabled: client !== null,
  listRegions,
  waitForStart,
} as const

export default fp(async app => {
  await app.register((await import('@fastify/autoload')).default, {
    dir: resolve(import.meta.dirname, 'plugins'),
  })
})
