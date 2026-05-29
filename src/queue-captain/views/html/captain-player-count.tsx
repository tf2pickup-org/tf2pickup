import { collections } from '../../../database/collections'

export async function CaptainPlayerCount() {
  const count = await collections.queuePlayers.countDocuments()
  return <span id="captain-player-count">{count}</span>
}
