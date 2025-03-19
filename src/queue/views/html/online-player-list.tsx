import { collections } from '../../../database/collections'
import { IconUserCircle } from '../../../html/components/icons'
import type { SteamId64 } from '../../../shared/types/steam-id-64'

interface OnlinePlayer {
  steamId: SteamId64
  name: string
}

export async function OnlinePlayerList() {
  const onlinePlayers = await collections.onlinePlayers
    .find({})
    .sort({ name: 1 })
    .collation({ locale: 'en', caseLevel: true })
    .project<OnlinePlayer>({ _id: 0, steamId: 1, name: 1 })
    .toArray()

  return (
    <div class="online-player-list" id="online-player-list">
      <h6>
        <IconUserCircle size={18} />
        <span id="online-player-count">Players online: {onlinePlayers.length}</span>
      </h6>

      {onlinePlayers.map(player => (
        <a href={`/players/${player.steamId}`} preload="mousedown" safe>
          {player.name}
        </a>
      ))}
    </div>
  )
}
