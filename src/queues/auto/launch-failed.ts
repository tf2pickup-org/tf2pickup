import { collections } from '../../database/collections'
import type { QueueId } from '../../database/models/queue.model'
import { QueueState } from '../../database/models/queue-state.model'
import { preReady } from '../../pre-ready'
import { getState } from '../get-state'
import { enterState } from './enter-state'
import { queueCommand } from './queue-command'

export async function launchFailed(queue: QueueId) {
  await queueCommand('launch-failed', async emit => {
    if ((await getState(queue)) !== QueueState.launching) {
      return
    }

    // otherwise the still-full queue readies everybody up and launches again straight away
    const players = (
      await collections.queueSlots.find({ queue, player: { $ne: null } }).toArray()
    ).map(({ player }) => player!.steamId)
    for (const player of players) {
      await preReady.cancel(player)
    }

    await enterState(queue, QueueState.waiting, emit)
  })
}
