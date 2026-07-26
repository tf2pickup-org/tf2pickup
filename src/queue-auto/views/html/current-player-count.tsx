import { collections } from '../../../database/collections'
import { QueuePlayerCount } from '../../../queue/views/html/queue-player-count'

export async function CurrentPlayerCount() {
  const current = await collections.queueSlots.countDocuments({ player: { $ne: null } })
  return <QueuePlayerCount count={current} />
}
