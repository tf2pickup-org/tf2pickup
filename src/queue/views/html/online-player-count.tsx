import { collections } from '../../../database/collections'

export async function OnlinePlayerCount() {
  const onlinePlayers = await collections.onlinePlayers.countDocuments()
  return <span id="online-player-count">Players online: {onlinePlayers}</span>
}
