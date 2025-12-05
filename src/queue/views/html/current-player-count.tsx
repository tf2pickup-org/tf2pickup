import { collections } from '../../../database/collections'

export async function CurrentPlayerCount() {
  const current = await collections.queueSlots.countDocuments({ player: { $ne: null } })
  return <span id="queue-current-player-count">{current}</span>
}
