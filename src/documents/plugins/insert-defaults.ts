import fp from 'fastify-plugin'
import { collections } from '../../database/collections'
import { readFile } from 'fs/promises'
import { resolve } from 'path'

export default fp(async () => {
  await collections.documents.updateOne(
    { name: 'rules' },
    {
      $setOnInsert: {
        body: (
          await readFile(resolve(import.meta.dirname, '..', 'default', 'rules.md'))
        ).toString(),
      },
    },
    {
      upsert: true,
    },
  )

  await collections.documents.updateOne(
    { name: 'privacy policy' },
    {
      $setOnInsert: {
        body: (
          await readFile(resolve(import.meta.dirname, '..', 'default', 'privacy-policy.md'))
        ).toString(),
      },
    },
    {
      upsert: true,
    },
  )
})
