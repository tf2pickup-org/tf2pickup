import { collections } from '../database/collections'
import { type Tasks } from './tasks'

export async function cancelAll<T extends keyof Tasks>(name: T) {
  await collections.tasks.deleteMany({ name })
}
