import { MongoDBStorage, Umzug } from 'umzug'
import { logger } from './logger'
import { database } from './database/database'

const u = new Umzug({
  migrations: { glob: ['migrations/*.ts', { cwd: import.meta.dirname }] },
  logger,
  storage: new MongoDBStorage({
    connection: database,
    collectionName: 'migrations2',
  }),
})

const pending = await u.pending()
logger.info(`${pending.length} pending migrations`)

await u.up()
