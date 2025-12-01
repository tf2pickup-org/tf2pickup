import { logger } from '../logger'
import { players } from '../players'

export async function up() {
  logger.info('starting ETF2L profile synchronization migration')
  await players.synchronizeEtf2lProfiles()
  logger.info('finished ETF2L profile synchronization migration')
}
