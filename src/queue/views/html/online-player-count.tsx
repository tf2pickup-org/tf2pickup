import { collections } from '../../../database/collections'

export async function OnlinePlayerCount() {
  const onlinePlayers = await collections.onlinePlayers.countDocuments()
  return (
    <span id="online-player-count" class="whitespace-nowrap">
      Players online: {onlinePlayers}
    </span>
  )
}
