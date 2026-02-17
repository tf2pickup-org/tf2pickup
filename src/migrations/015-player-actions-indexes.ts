import { collections } from '../database/collections'

export async function up() {
  await collections.playerActions.createIndex({ timestamp: -1 })
  await collections.playerActions.createIndex({ player: 1, timestamp: -1 })
  await collections.playerActions.createIndex({ action: 1, timestamp: -1 })
}
