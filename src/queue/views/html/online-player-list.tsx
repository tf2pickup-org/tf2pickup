import { collections } from '../../../database/collections'
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
    <ul class="online-player-list" id="online-player-list">
      {onlinePlayers.map(player => (
        <li>
          <a href={`/players/${player.steamId}`} preload="mousedown" safe>
            {player.name}
          </a>
        </li>
      ))}
    </ul>
  )
}
