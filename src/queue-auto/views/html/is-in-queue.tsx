import { collections } from '../../../database/collections'
import type { Gamemode } from '../../../shared/types/gamemode'
import type { SteamId64 } from '../../../shared/types/steam-id-64'

export async function IsInQueue(props: { gamemode: Gamemode; actor?: SteamId64 | undefined }) {
  const isInQueue = !!(
    props.actor &&
    (await collections.queueSlots.countDocuments({
      gamemode: props.gamemode,
      'player.steamId': props.actor,
    })) > 0
  )
  return <input type="hidden" id="isInQueue" value={isInQueue.toString()} />
}
