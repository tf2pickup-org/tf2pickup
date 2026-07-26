import { collections } from '../database/collections'
import { environment } from '../environment'
import { queueConfigs } from '../queue-auto/configs'
import { getPickOrder } from './get-pick-order'

export async function isLaunchable(): Promise<boolean> {
  const draft = await collections.captainDraft.findOne({})
  if (!draft?.selectedMap) {
    return false
  }

  const config = queueConfigs[environment.QUEUE_CONFIG]
  if (draft.picks.length !== getPickOrder(config).length) {
    return false
  }

  const drafted = [...draft.picks.map(pick => pick.player), ...Object.values(draft.captains)]
  const stillQueued = await collections.queuePlayers.countDocuments({
    steamId: { $in: drafted },
  })
  return stillQueued === drafted.length
}
