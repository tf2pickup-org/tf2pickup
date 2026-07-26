import type { PickDeep } from 'type-fest'
import { collections } from '../../database/collections'
import type { PlayerModel } from '../../database/models/player.model'
import { isDeletedUser, type SteamId64 } from '../../shared/types/steam-id-64'
import { DeletedUser } from './deleted-user'

// Renders a link to a player's profile, or a greyed-out "deleted user" label
// (without a link) when the steam id belongs to a player that has been deleted.
export async function PlayerLink(props: { steamId: SteamId64; class?: string | undefined }) {
  if (isDeletedUser(props.steamId)) {
    return <DeletedUser class={props.class} />
  }

  const player = await collections.players.findOne<PickDeep<PlayerModel, 'steamId' | 'name'>>(
    { steamId: props.steamId },
    { projection: { steamId: 1, name: 1 } },
  )
  if (!player) {
    return <DeletedUser class={props.class} />
  }

  return (
    <a href={`/players/${player.steamId}`} class={props.class} safe>
      {player.name}
    </a>
  )
}
