import { randomBytes as randomBytesCb } from 'node:crypto'
import { collections } from '../database/collections'
import { promisify } from 'node:util'
import { logger } from '../logger'

const randomBytes = promisify(randomBytesCb)

export async function get(secretName: string): Promise<Buffer> {
  logger.trace(`secrets.get(secretName=${secretName})`)
  const secret = await collections.secrets.findOne({ name: secretName })
  if (secret === null) {
    logger.info(`secret "${secretName}" not found; generating...`)
    const value = await randomBytes(32)
    await collections.secrets.insertOne({ name: secretName, value: value.toString('hex') })
    logger.info(`secret "${secretName}" generated`)
    return value
  } else {
    return Buffer.from(secret.value, 'hex')
  }
}
