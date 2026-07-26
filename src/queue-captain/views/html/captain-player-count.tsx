import { collections } from '../../../database/collections'
import { QueuePlayerCount } from '../../../queue/views/html/queue-player-count'

export async function CaptainPlayerCount() {
  const count = await collections.queuePlayers.countDocuments()
  return <QueuePlayerCount count={count} />
}
