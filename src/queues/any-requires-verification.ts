import { collections } from '../database/collections'

export async function anyRequiresVerification(): Promise<boolean> {
  return (await collections.queues.countDocuments({ enabled: true, requireVerification: true })) > 0
}
