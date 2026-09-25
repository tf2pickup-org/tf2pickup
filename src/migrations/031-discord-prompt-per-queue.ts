import { collections } from '../database/collections'
import { database } from '../database/database'

// A guild used to hold a single queue prompt; it becomes the prompt of the queue it showed, the
// default one.
export async function up() {
  const defaultQueue = await collections.queues.findOne(
    { enabled: true },
    { sort: { position: 1 } },
  )
  if (!defaultQueue) {
    return
  }

  await database.collection('discord.botstate').updateMany({ promptMessageId: { $exists: true } }, [
    {
      $set: {
        promptMessageIds: {
          $arrayToObject: [[{ k: defaultQueue._id.toHexString(), v: '$promptMessageId' }]],
        },
      },
    },
    { $unset: 'promptMessageId' },
  ])
}
