import { collections } from '../database/collections'

export async function up() {
  await collections.activityLog.createIndex({ timestamp: -1 })
  await collections.activityLog.createIndex({ player: 1, timestamp: -1 })
  await collections.activityLog.createIndex({ actor: 1, timestamp: -1 })
  await collections.activityLog.createIndex({ admin: 1, timestamp: -1 })
}
