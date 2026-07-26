import { collections } from '../../../database/collections'
import type { SteamId64 } from '../../../shared/types/steam-id-64'

// Same contract as the auto-mode component (PreReadyUpButton syncs its disabled
// state off this id), backed by the captain queue's own collection.
export async function IsInQueue(props: { actor?: SteamId64 | undefined }) {
  const isInQueue = !!(
    props.actor && (await collections.queuePlayers.countDocuments({ steamId: props.actor })) > 0
  )
  return <input type="hidden" id="isInQueue" value={isInQueue.toString()} />
}
