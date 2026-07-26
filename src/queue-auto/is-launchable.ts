import { collections } from '../database/collections'

export async function isLaunchable(): Promise<boolean> {
  const notReadyCount = await collections.queueSlots.countDocuments({
    $or: [{ player: { $eq: null } }, { ready: { $eq: false } }],
  })
  return notReadyCount === 0
}
