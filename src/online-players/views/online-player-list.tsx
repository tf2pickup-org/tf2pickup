import { collections } from '../../database/collections'
import { SteamId64 } from '../../shared/types/steam-id-64'

interface OnlinePlayer {
  steamId: SteamId64
  name: string
}

export async function OnlinePlayerList() {
  const onlinePlayers = await collections.onlinePlayers
    .find({})
    .project<OnlinePlayer>({ _id: 0, steamId: 1, name: 1 })
    .toArray()

  return (
    <div class="online-player-list" id="online-player-list">
      <h6>
        <i class="ti ti-user-circle text-lg"></i>
        {/* <IconUserCircle /> */}
        <span id="online-player-count">Players online: {onlinePlayers.length}</span>
      </h6>

      {onlinePlayers.map(player => (
        <a href={`/players/${player.steamId}`} class="item" safe>
          {player.name}
        </a>
      ))}
    </div>
  )
}
