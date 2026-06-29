import { collections } from '../../../database/collections'
import { PlayerRole } from '../../../database/models/player.model'
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

  const adminSteamIds = new Set(
    (
      await collections.players
        .find({
          steamId: { $in: onlinePlayers.map(player => player.steamId) },
          roles: PlayerRole.admin,
        })
        .project<{ steamId: SteamId64 }>({ _id: 0, steamId: 1 })
        .toArray()
    ).map(player => player.steamId),
  )

  return (
    <ul class="online-player-list fade-scroll" id="online-player-list" data-fade-scroll>
      {onlinePlayers.map(player => {
        const isAdmin = adminSteamIds.has(player.steamId)
        return (
          <li>
            <a
              href={`/players/${player.steamId}`}
              class={isAdmin ? 'admin' : undefined}
              preload="mousedown"
              safe
            >
              {player.name}
            </a>
          </li>
        )
      })}
    </ul>
  )
}
