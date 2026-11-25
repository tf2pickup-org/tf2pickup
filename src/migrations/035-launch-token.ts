import { nanoid } from 'nanoid'
import { collections } from '../database/collections'
import { QueueState } from '../database/models/queue-state.model'

// Both launch modes correlate a replayed launch with its game through one token now.
export async function up() {
  await collections.games.updateMany(
    { captainDraftToken: { $exists: true } },
    { $rename: { captainDraftToken: 'launchToken' } },
  )
  if (await collections.games.indexExists('captainDraftToken_1')) {
    await collections.games.dropIndex('captainDraftToken_1')
  }

  // an auto queue caught mid-launch by the upgrade
  const launching = await collections.queueState
    .find({ state: QueueState.launching, launchToken: { $exists: false } })
    .toArray()
  for (const { queue } of launching) {
    await collections.queueState.updateOne({ queue }, { $set: { launchToken: nanoid() } })
  }
}
