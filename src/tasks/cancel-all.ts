import { collections } from '../database/collections'
import { type Tasks } from './tasks'

export async function cancelAll(name: keyof Tasks) {
  await collections.tasks.deleteMany({ name })
}
