import test from '@playwright/test'
import { Db, MongoClient } from 'mongodb'

/**
 * @deprecated If possible, try not to use this fixture.
 */
export const accessMongoDb = test.extend<{ db: Db }>({
  db: async ({}, use) => {
    if (!('MONGODB_URI' in process.env)) {
      throw new Error(`MONGODB_URI is required to run this test`)
    }

    const client = new MongoClient(process.env['MONGODB_URI']!)
    await client.connect()
    const db = client.db()
    await use(db)
    await client.close()
  },
})

export { expect } from '@playwright/test'
