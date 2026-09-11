import { collections } from '../../../database/collections'
import type { Gamemode } from '../../../shared/types/gamemode'

export async function CurrentPlayerCount(props: { gamemode: Gamemode }) {
  const current = await collections.queueSlots.countDocuments({
    gamemode: props.gamemode,
    player: { $ne: null },
  })
  return <span id="queue-current-player-count">{current}</span>
}
