import fastify from 'fastify'
import kitaHtml from '@kitajs/fastify-html-plugin'
import view from '@fastify/view'
import handlebars from 'handlebars'
import { resolve } from 'node:path'
import { client } from './database'
import type { QueueSlotModel } from './queue/models/queue-slot.model'
import { queue } from './queue/views/queue'

const app = fastify({ logger: true })
await app.register(kitaHtml)

app.get('/', async (req, reply) => {
  const collection = client.db().collection<QueueSlotModel>('queue.slots')
  const slots = await collection.find().toArray()
  return reply.html(queue())
})

await app.listen({ port: 3000 })
